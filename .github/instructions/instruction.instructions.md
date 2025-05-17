---
applyTo: '**'
---

1. Use AdonisJS CLI to generate boilerplate

   - Always use `node ace make:*` commands (e.g., `make:controller`, `make:model`) to generate standard structure with typing.

2. Follow the MVC structure strictly

   - Keep business logic inside **services**, not controllers.
   - Use **repositories** if data access logic grows complex.

3. Leverage TypeScript fully

   - Use proper type annotations (`string`, `number`, `DateTime`, etc.).
   - Avoid `any` at all costs. Use interfaces and types where necessary.

4. Use Lucid models properly

   - Define all columns with correct decorators (`@column`, `@belongsTo`, etc.).
   - Add validation and computed properties with `@beforeSave`, `@computed`.

5. Sanitize and validate input using validators

   - Create validators with `node ace make:validator`.
   - Use strong validation rules (`schema.string({}, [rules.email()])`, etc.).

6. Use route resource when possible

   - Prefer `Route.resource('posts', 'PostsController')` for CRUD APIs.
   - Always use route naming conventions for consistency.

7. Always handle errors gracefully

   - Use `try/catch` blocks for service calls or DB access.
   - Return meaningful error messages and appropriate HTTP status codes.

8. Write reusable services

   - Services should be **stateless** and testable.
   - Inject dependencies via constructor when needed.

9. Use environment variables with `Env.get()`

   - Never hardcode secrets or API keys.
   - Validate `.env` schema with `@adonisjs/env`.

10. Use middlewares for cross-cutting concerns

    - Auth, rate limiting, logging, etc. should live in custom middlewares.

11. Follow RESTful conventions

    - Use `GET`, `POST`, `PUT`, `DELETE` properly.
    - Never mix logic between endpoints.

12. Write tests for each feature

    - Use AdonisJS test runner with `test/*` directory.
    - Mock external services and DB calls where needed.

13. Format and lint code before committing

    - Use Prettier and ESLint with `@adonisjs/eslint-config`.
    - Add a pre-commit hook if possible (e.g., with Husky).

14. Use dependency injection

    - Favor AdonisJS IoC container (`use()` or `@inject`) instead of manually importing everything.

15. Keep everything modular and clean

    - Avoid bloated files. Split logic into small, focused units.

16. Respect asynchronous flows

    - Always `await` DB calls or service functions.
    - Avoid callback hell or deeply nested logic.

17. Document important parts of the code

    - Add docstrings or inline comments for complex logic or service APIs.

18. Optimize DB queries

    - Use eager loading (`.preload()`) to avoid N+1 problems.
    - Limit selected columns with `.select()`.

19. Use Events and Listeners for decoupling

    - For side effects like sending emails or logging, use the Event system.

20. Stay up to date with AdonisJS docs

    - Always refer to the official documentation: [https://docs.adonisjs.com](https://docs.adonisjs.com)

### 📌 General Architecture & Design

- **Use Models only:** All database operations must be through AdonisJS Models (e.g., `DmCampaign`, `Account`).
- **Strict Input Control:** Always use `request.only([...])`. Never use `request.all()`.
- **Fail fast:** Always prefer `findOrFail`, `findByOrFail` for strict integrity.
- **Keep data synced:** Always call `.refresh()` before operating on or after writing to a model.
- **Nomenclature:** Use camelCase in code, snake_case in DB. Keep model and column names consistent, descriptive, and explicit.

---

### 🛠️ Create

```ts
await Model.create({ field1, field2 })
```

- Insert new record with exact DB fields.
- For JSON/text fields (e.g., `keywords`), serialize via `JSON.stringify(...)`.

---

### 🔍 Read

```ts
await Model.findOrFail(id)
await Model.findByOrFail('field', value)
```

- Prefer `findOrFail` over nullable queries to ensure early failure.
- Always use `const` for immutability unless mutation is required.

---

### ✏️ Update

```ts
instance.prop = newValue
await instance.save()
```

- Modify fields directly on the instance.
- Check for changes before `.save()` to reduce write load:

```ts
if (instance.prop !== newValue) {
  instance.prop = newValue
  await instance.save()
}
```

---

### ❌ Delete

```ts
await instance.delete()
```

- Always get via `findOrFail` before deletion.

---

### 🔄 Refresh

```ts
await instance.refresh()
```

- Required before or after critical changes.
- Keeps in-memory state aligned with DB.

---

### ⏳ Cursor Update

```ts
if (cursor && instance.cursor !== cursor) {
  instance.cursor = cursor
  await instance.save()
}
```

- Avoid unnecessary DB writes.

---

### 📈 Counter Incrementation

```ts
instance.counter++
await instance.save()
```

- Never do arithmetic inline with DB queries—always update in memory, then persist.

---

### 🚦 Toggle Boolean

```ts
instance.flag = !instance.flag
await instance.save()
```

- Prefer this style for feature toggles.

---

### 🔁 Async Pattern Rules

- Never call multiple `await` statements in loops — use `Promise.all()` where possible.
- Always `await` database methods — never leave promises unresolved.
- Wrap multi-step operations in `try/catch`.
- Ensure awaited calls are deterministic (no ambiguity on returned value types).

---

### 🧱 Transaction Use (Atomic Sets)

```ts
await Database.transaction(async (trx) => {
  const model = new Model()
  model.useTransaction(trx)
  model.prop = value
  await model.save()
})
```

- Use transactions for multi-model write safety.

---

### 🧼 Finalize Workflow State

```ts
instance.status = false
await instance.save()
```

- Ensure clean and predictable end-of-workflow state.

---

### 🔒 Session & Token Handling

```ts
await account.refresh()
```

- After any token update or external write, ensure latest values.

---

### ❗ Error Handling

```ts
try {
  await Model.findOrFail(id)
} catch (err) {
  console.error('Model not found', err)
  // Optionally flash or return
}
```

- Log explicitly, fail with clarity.
- Never swallow errors silently.

---

### ✅ Recap: Must-Use Functions

| Action       | Function(s) Used                   |
| ------------ | ---------------------------------- |
| Create       | `Model.create({...})`              |
| Read (ID)    | `Model.findOrFail(id)`             |
| Read (Field) | `Model.findByOrFail(field, value)` |
| Update       | `modelInstance.prop = x; save()`   |
| Delete       | `modelInstance.delete()`           |
| Refresh      | `modelInstance.refresh()`          |
| Transaction  | `Database.transaction(...)`        |

---

Would you like this exported as PDF or auto-generated markdown doc for live preview?
