## 0. Проверить, установлен ли Node.js и npm

Открыть терминал / PowerShell и выполнить:

```bash
node -v
npm -v
```

Если команды дают номера версий (например, `v22.1.0`, `10.8.1`), можно переходить к шагам из нашей инструкции.

Если появляется ошибка вида:

> "Имя 'npm' не распознано как имя командлета..."

значит Node.js не установлен или не добавлен в PATH.

---

## 1. Установить Node.js и npm (для Swagger UI)

### Windows

1. Зайти на официальный сайт:  
   https://nodejs.org/

2. Скачать **LTS**‑версию (кнопка “LTS”) для Windows.

3. Установить, не меняя галочки по умолчанию:
   - галочка “Add to PATH” должна быть включена.

4. Закрыть и открыть PowerShell/Terminal заново (чтобы обновился PATH).

5. Проверить:

   ```bash
   node -v
   npm -v
   ```

### macOS (через установщик)

1. С сайта https://nodejs.org/ скачать `.pkg` для macOS и установить.
2. Затем в Terminal:

   ```bash
   node -v
   npm -v
   ```

### Linux (пример для Debian/Ubuntu)

```bash
sudo apt update
sudo apt install -y nodejs npm
node -v
npm -v
```

(Или через nvm, но для Swagger‑MVP достаточно системного npm.)

---

## 2. После установки Node.js — запуск Swagger

Дальше человек идёт по нашему уже описанному алгоритму:

1. Клонирует репозиторий:

   ```bash
   git clone https://github.com/USERNAME/davidex01-business-messenger.git
   cd davidex01-business-messenger
   ```

2. Переходит в папку `web`:

   ```bash
   cd web
   ```

3. Если в репозитории **уже лежит** твой `package.json` (ты его закоммитил), то **`npm init -y` делать НЕ нужно**. Достаточно:

   ```bash
   npm install
   ```

   Это подтянет `express` и `swagger-ui-express` по зависимостям из `package.json`.

   Если `package.json` нет (ты его не добавил в репо) — тогда:

   ```bash
   npm init -y
   npm install express swagger-ui-express
   ```

   и затем поправить `package.json`, как мы обсуждали.

4. Убедиться, что в `web` есть файлы:

   - `openapi.js`
   - `server.js`
   - `package.json` (и, возможно, `package-lock.json`)

5. Запустить Swagger UI:

   ```bash
   npm start
   ```

6. Открыть в браузере:

   ```
   http://localhost:3000/api-docs
   ```

---

## 3. Что важно тебе сделать в репозитории

Чтобы человек НЕ сталкивался с `npm init -y` и минимум настраивал руками, тебе лучше:

1. Один раз локально:
   - В `web/` выполнить:
     ```bash
     npm init -y
     npm install express swagger-ui-express
     ```
   - Добавить в `package.json` скрипт `"start": "node server.js"` (если не добавился).
2. Закоммитить:
   - `web/package.json`
   - `web/package-lock.json`
   - `web/openapi.js`
   - `web/server.js`
3. Добавить `.gitignore` (в корень или в `web/`), чтобы не коммитить `node_modules`:

   ```gitignore
   web/node_modules/
   ```

Тогда инструкция для любого разработчика упростится до:

```bash
git clone ...
cd davidex01-business-messenger/web
npm install
npm start
# открыть http://localhost:3000/api-docs
```

И ошибки “npm не распознано” больше не будет, при условии, что человек сначала установит Node.js, как описано в шаге 1.