# VETKA Gridfinity Plus на GitHub Pages

Лендинг открывается в корне сайта, генератор доступен по пути `generator/`. Кнопка на лендинге использует относительную ссылку, которая работает в подпапке GitHub Pages и на собственном домене. [Репозиторий](https://github.com/VetkaStar/vetka-gridfinity-plus)

1. В **Settings → Pages → Build and deployment → Source** выберите **GitHub Actions**.
2. В **Actions → Deploy VETKA Gridfinity Plus → Run workflow** выберите основную ветку и запустите выкладку.
3. Откройте URL из окружения `github-pages` завершённого запуска. Проверьте переход с лендинга в генератор, построение модели и страницу лицензий с двумя архивами исходников.

Для локальной проверки запустите `python build_release.py --with-landing --output dist/pages-preview`, затем `python -m http.server 8346 --bind 127.0.0.1 --directory dist`. Сайт откроется по адресу `http://127.0.0.1:8346/pages-preview/`.

GitHub Actions собирает сайт из основной ветки и загружает его как артефакт Pages. В коммит входят исходники, а `dist/` остаётся результатом сборки. Архив исходников OpenSCAD вместе с лицензиями доступен с сайта, его размер превышает лимит обычного файла в GitHub. Предельный размер опубликованного сайта составляет 1 GB. [Лимиты GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

Свой домен добавляется в **Settings → Pages → Custom domain**. Затем настройте записи DNS у провайдера домена и включите **Enforce HTTPS**, когда эта настройка станет доступна. Перед сменой адреса экспортируйте пресеты, которые хотите перенести. [Настройка домена](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
