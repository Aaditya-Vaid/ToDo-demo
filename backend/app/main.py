from contextlib import asynccontextmanager
from datetime import date
from os import getenv

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .auth import create_access_token, get_current_user, hash_password, verify_password
from .database import Base, engine, get_db
from .models import Priority, Task, TaskStatus, User, utc_now
from .schemas import AuthResponse, TaskCreate, TaskRead, TaskUpdate, Token, UserCreate

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,https://to-do-demo-tcvf-p192g25av-aaditya-vaids-projects.vercel.app"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="ToDo API", version="0.1.0", lifespan=lifespan)

origins = [origin.strip() for origin in getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> AuthResponse:
    existing_user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(token=Token(access_token=create_access_token(user)), user=user)


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: UserCreate, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return AuthResponse(token=Token(access_token=create_access_token(user)), user=user)


@app.get("/tasks", response_model=list[TaskRead])
def list_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status_filter: TaskStatus | None = Query(default=None, alias="status"),
    overdue: bool = False,
    search: str | None = None,
) -> list[Task]:
    stmt = select(Task).where(Task.owner_id == current_user.id)
    if status_filter:
        stmt = stmt.where(Task.status == status_filter)
    if overdue:
        stmt = stmt.where(Task.status == TaskStatus.active, Task.due_date < date.today())
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(Task.title.ilike(term), Task.description.ilike(term)))
    stmt = stmt.order_by(Task.created_at.desc())
    return list(db.scalars(stmt).all())


@app.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Task:
    task = Task(
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority or Priority.medium,
        due_date=payload.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_owned_task(task_id: str, user: User, db: Session) -> Task:
    task = db.scalar(select(Task).where(Task.id == task_id, Task.owner_id == user.id))
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@app.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Task:
    task = get_owned_task(task_id, current_user, db)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(task, field, value)
    task.updated_at = utc_now()
    db.commit()
    db.refresh(task)
    return task


@app.patch("/tasks/{task_id}/toggle", response_model=TaskRead)
def toggle_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Task:
    task = get_owned_task(task_id, current_user, db)
    if task.status == TaskStatus.completed:
        task.status = TaskStatus.active
        task.completed_at = None
    else:
        task.status = TaskStatus.completed
        task.completed_at = utc_now()
    task.updated_at = utc_now()
    db.commit()
    db.refresh(task)
    return task


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    task = get_owned_task(task_id, current_user, db)
    db.delete(task)
    db.commit()
