# Galaxy Runner

Браузерный 2D-платформер в космическом сеттинге на TypeScript и Phaser.

[Играть](https://game.galaxy-runner.ru)

## Запуск через Docker

Установите и запустите Docker Desktop.

В папке проекта выполните:

```bash
docker compose up --build -d
```

Команда соберёт игру и запустит контейнер с Nginx. 

Игра будет доступна по адресу http://localhost:8080

После изменения исходников пересоберите игру командой `docker compose up --build -d`.

## Публикация на GitHub Pages

В `vite.config.js` укажите название репозитория:

```js
base: "/GalaxyRunnerGame/"
```

Выполните публикацию:

```bash
npm run deploy
```

Команда собирает игру и отправляет содержимое `dist` в ветку `gh-pages`. Если ветки нет, она создаётся автоматически.

В настройках репозитория **Settings → Pages** выберите **Deploy from a branch**, ветку **gh-pages** и папку **/ (root)**, затем нажмите **Save**.

Игра будет доступна по адресу `https://USERNAME.github.io/GalaxyRunnerGame/`

## Публикация на GitHub Pages со своим доменом

В `vite.config.js` укажите:

```js
base: "/"
```

Создайте файл `public/CNAME` и запишите в него свой домен без `https://`, например:

```text
game.example.com
```

Выполните публикацию:

```bash
npm run deploy
```

В настройках репозитория **Settings → Pages** выберите **Deploy from a branch**, ветку **gh-pages** и папку **/ (root)**. В поле **Custom domain** укажите свой домен.

В панели управления DNS домена добавьте запись:

| Тип | Имя | Значение |
|---|---|---|
| CNAME | `game` | `USERNAME.github.io` |

Замените `USERNAME` своим именем пользователя GitHub. После проверки домена и выпуска сертификата включите **Enforce HTTPS** в настройках Pages.

Игра будет доступна по адресу `https://game.example.com`.

Пример приведён для поддомена `game.example.com`. Для корневого домена `example.com` используйте [инструкцию GitHub](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

Файл `public/CNAME` автоматически копируется в сборку при каждой публикации. Для обновления игры повторно выполните `npm run deploy`.
