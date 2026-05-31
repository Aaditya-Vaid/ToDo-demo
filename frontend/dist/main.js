"use strict";
const todos = [
    { id: 1, title: 'Review project priorities', completed: false },
    { id: 2, title: 'Plan a focused work block', completed: true },
];
const app = document.querySelector('#app');
if (!app) {
    throw new Error('App root element was not found.');
}
app.innerHTML = `
  <main class="todo-page">
    <section class="todo-card" aria-labelledby="todo-heading">
      <div class="todo-card__header">
        <span class="todo-card__eyebrow">Daily planner</span>
        <h1 id="todo-heading" class="todo-card__title">To-Do List</h1>
        <p class="todo-card__description">
          Add your tasks, mark them complete, and keep the day moving with a calm beige and dark grey workspace.
        </p>
      </div>

      <form class="todo-form" id="todo-form">
        <label class="todo-form__label" for="todo-input">Add a to-do item</label>
        <div class="todo-form__controls">
          <input
            id="todo-input"
            class="todo-form__input"
            type="text"
            placeholder="e.g. Prepare meeting notes"
            autocomplete="off"
          />
          <button class="todo-form__button" type="submit">Add Task</button>
        </div>
      </form>

      <div class="todo-summary" id="todo-summary" aria-live="polite"></div>
      <ul class="todo-list" id="todo-list" aria-label="Current to-do items"></ul>
    </section>
  </main>
`;
const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const summary = document.querySelector('#todo-summary');
const todoList = document.querySelector('#todo-list');
if (!form || !input || !summary || !todoList) {
    throw new Error('To-do app elements were not found.');
}
const todoForm = form;
const todoInput = input;
const todoSummary = summary;
const todosElement = todoList;
function renderTodos() {
    const remainingCount = todos.filter((todo) => !todo.completed).length;
    todoSummary.innerHTML = `
    <span>${todos.length} total tasks</span>
    <span>${remainingCount} remaining</span>
  `;
    todosElement.innerHTML = todos
        .map((todo) => `
        <li class="todo-list__item${todo.completed ? ' todo-list__item--complete' : ''}" data-id="${todo.id}">
          <label class="todo-list__task">
            <input
              class="todo-list__checkbox"
              type="checkbox"
              ${todo.completed ? 'checked' : ''}
              aria-label="Mark ${escapeHtml(todo.title)} as ${todo.completed ? 'incomplete' : 'complete'}"
            />
            <span>${escapeHtml(todo.title)}</span>
          </label>
          <button class="todo-list__delete" type="button" aria-label="Remove ${escapeHtml(todo.title)}">
            Delete
          </button>
        </li>
      `)
        .join('');
}
function addTodo(title) {
    todos.unshift({
        id: Date.now(),
        title,
        completed: false,
    });
    renderTodos();
}
function toggleTodo(id) {
    const todo = todos.find((item) => item.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        renderTodos();
    }
}
function removeTodo(id) {
    const todoIndex = todos.findIndex((item) => item.id === id);
    if (todoIndex >= 0) {
        todos.splice(todoIndex, 1);
        renderTodos();
    }
}
function getTodoId(element) {
    return Number(element.closest('.todo-list__item')?.dataset.id);
}
function escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (character) => {
        const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#039;',
            '"': '&quot;',
        };
        return entities[character];
    });
}
todoForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = todoInput.value.trim();
    if (!title) {
        return;
    }
    addTodo(title);
    todoInput.value = '';
    todoInput.focus();
});
todosElement.addEventListener('change', (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.matches('.todo-list__checkbox')) {
        toggleTodo(getTodoId(target));
    }
});
todosElement.addEventListener('click', (event) => {
    const target = event.target;
    if (target instanceof HTMLButtonElement && target.matches('.todo-list__delete')) {
        removeTodo(getTodoId(target));
    }
});
renderTodos();
//# sourceMappingURL=main.js.map