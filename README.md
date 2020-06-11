# Live DEMO

## Live DEMO via browser with my token

<https://graphql-wrike.herokuapp.com/>

<https://graphql-wrike.herokuapp.com/voyager>

By default is using token from my demo account. But you may provide your token via `Authorization` header:

<img width="1102" alt="Screen Shot 2020-06-12 at 01 48 04" src="https://user-images.githubusercontent.com/1946920/84432588-d89fcf80-ac4e-11ea-9b5a-0685c7dfd824.png">

Get your Authorization token here: <https://www.wrike.com/frontend/apps/index.html#/api>

Docs about Wrike's authorization: <https://developers.wrike.com/oauth-20-authorization/>

## Live DEMO on your server

```bash
docker run --rm -p 3000:3000 -e AUTH_TOKEN="XXXX" docker.io/nodkz/wrike-graphql:latest
```

## Подключаемся к АПИ

- `yarn add axios debug`
- Настраиваем axios
  - Настраиваем дебаггинг
- пишем первый примитивный тест

## Поднимаем простой graphql-сервер

- `yarn add graphql apollo-server ts-node-dev`
- добавляем dev-скрипт `DEBUG=axios:request ts-node-dev --no-notify --respawn --watch src/schema src/server.ts`
- поднимаем болванку схемы `yarn add graphql-compose graphql-compose-modules`

## Заводим Tasks

Документация АПИ метода <https://developers.wrike.com/documentation/api/methods/query-tasks>

### Создаем task/findMany.ts

- Проблемы апи
  - Микс из полей (фильтр, сортировка, проекция, поиск по subTasks)
  - Тяжело подобрать формат
    - например `fields` надо передавать как `['name1', 'name2']`
    - `effortAllocation`, `billingType` в проекции работают только для каких-то платных аккаунтов
    - `recurrent` вообще не возвращает данные
  - Есть `limit`, но нет `offset`
    - можно использовать курсор `nextPageToken`, только он протухает через час-два (и опять запрашивать все данные сначала)
- Пишем примитивный тест
- Добавляем в фильтр поля `folderId` и `spaceId`, которые по капотом будут роутиться на другие эндпоинты
- Т.к. есть проекция полей, то необходимо обернуть `findMany()` и добавить в него обработку `info: GraphQLResolveInfo` полученную в резолвере, чтоб она конвертировалась в `projection`

### Создаем task/findByIds.ts

- Возвращаются все поля без проекции как в `task/findMany.ts`
- Можно запросить до 100 записей
- Пишем примитивный тест
- Проблема дат в разных форматах
  - ❌ startDate={"start":"2020-03-06T14:47:49.000Z"}
  - ❌ startDate={"start":"2020-03-06T14:47:49Z"}
  - ✅ startDate={"start":"2020-03-06T14:47:49"}
  - ✅ startDate={"start":"2020-03-06"}
  - ❌ createdDate={"start":"2020-03-06"}
  - ✅ createdDate={"start":"2020-03-06T14:47:49Z"}
  - ❌ createdDate={"start":"2020-03-06T14:47:49.000Z"}
  - Не информативные ошибки
    - "errorDescription": "Parameter 'createdDate' value is invalid",
- Проблема с курсорной пагинацией `pageSize=2`, если задан текстовый поиск `title="TaskList"` – не возвращается курсор и кол-во элементов

### Заводим Task в GraphQL-схему

- Создаем TaskTC.ts
  - `yarn add graphql-compose-json`
- Добавляем в схему поле `taskByIds.ts`
- Добавляем в схему поле `taskFindMany.ts`

GraphQL запрос:

```graphql
{
  taskFindMany(
    filter: { title: "TaskList", createdDate: { start: "2020-03-06T14:47:49Z" } },
    limit: 3,
    sort: CREATED_DATE_DESC
  ) {
    id
    createdDate
    title
    sharedIds
    hasAttachments
    authorIds
  }
}
```

трансформируется в

```bash
  axios:request ✅ 200 get /tasks
  axios:request     title="TaskList"
  axios:request     createdDate={"start":"2020-03-06T14:47:49Z"}
  axios:request     limit=3
  axios:request     sortField="CreatedDate"
  axios:request     sortOrder="Desc"
  axios:request     fields="[\"hasAttachments\",\"sharedIds\"]"
```

### Заводим создание тасков

- Вендор АПИ метод vendor/task/create.ts
- Заводим Скаляры и Энумы
- Заводим первую мутацию taskCreate
- 🛑 Боль
  - Ушло порядка 1 часа чтобы описать все поля (нет статической типизации)
  - Есть пример CURL-запроса, но нет примера JSON data (я б за 5 сек сгенерил инпут тип)
  - Нахожусь в Task а отправлять POST-запрос нужно в папки `/folders/${folderId}/tasks`

### Заводим редактирование тасков

- Неочевилное наличие полей `add`, `remove`
  - для `parents`, `shareds`, `responsibles`
  - есть метод `addFollowers`, но нет метода `removeFollowers` (баг или фича? 😜)
  - нет простой возможности отредактировать `parents`, `shareds`, `responsibles`, `followers` – типо получили таск, а потом просто отправилили новые массивы с данным. Их надо на клиенте дробить на два массива: кого добавлять, кого удалять.
  - делаем методы добавления/удаления `parents`, `shareds`, `responsibles` ЯВНЫМИ, т.е. отдельными мутациями
- 🛑🤔 А где endpoint по работе с `CustomStatuses`? `CustomStatusID` есть, а ендпоинта нет.

## Заводим User

Документация АПИ метода <https://developers.wrike.com/documentation/api/methods/query-user>

### Создаем user/findById.ts

- Можно запросить одного пользователя, но возвращает массив
- Пишем простой тест

### Заводим UserTC в GraphQL-схему

- создаем `UserTC.ts`
- в схему добавляем `userById`
- в `TaskTC` добавляем новые поля (связи), которые будут возвращать пользователей:
  - shareds
  - responsibles
  - authors
  - followers
- в `ContactTC` добавляем новые поля (связи), которые будут возвращать таски
  - tasksAuthored
  - tasksResponsible

## Заводим контакты

- Чем отличаются `Contacts` от `Users` (типы вроде как индентичны)
- GET /contacts нет сортировки, пагинации, слабая фильтрация
- Поле `metadata` может хранить массив `{ key/value }`, но фильтровать может только по одному ключу

## Заводим groups

- GET /groups нет сортировки, пагинации, слабая фильтрация
- Чутка непонятно как из контактов сделать Union type из Groups и Users
- Странно что группу можно отредактировать (metadata) через два места `put /groups/:id` и `put /contacts/:id`
- `addMembers`, `removeMember` вынесены в отдельные методы

## Заводим account

- Странно что эндпоинт не заканчивается на `s` – `GET /account`
- Странно что есть `Metadata filter` для получения аккаунта, хотя метод редактирования не поддерживает передачу AccountID. Какой смысл фильтровать по мете?

## Заводим Folders

- Объединяем 3 ендпоинта получения списка папок
- 🛑 Ошибка в описании апи `Folder.project.status` может вернуть пустое значение
- 🤬 Почему я не могу запросить данные рутовой папки через `/folders/IEADMUW4I7777777` падает с ошибкой "Operation is not allowed for logical folder". Пипец как не удобно дергать их через аккаунт. Ну и бог с ним, что папка виртуальная: вы же этот айдишник возвращаете в тасках – верните и через folders эндпоинт ее данные.
- ❓Не описаны типы для 10 полей, которые возвращаются через `fields`
- `Note: when any of query filter parameters are present (e.g. descendants=false, metadata) response is switched to Folder model.` – эта штука убивает при поиске 10 полей, которые возвращаются через `fields`. Понятно что нагрузка, но надо посмотреть как вернуть для `descendants=true`
- Что такое `customColumnIds` и как оно коррелирует с `customFieldIds`?
- Печально что папка не возвращает массив родителей 😢
- ❗️Кстати, нельзя при создании папки указать несколько родителей. А при редактировании можно.
- Завел отдельные мутации для `addParents`, `removeParents`, `addShareds`, `removeShareds`
- Заводим асинхронное копирование папок (какое-то детское мак кол-во для копирования – 250)

## Заводим Workflow

- Честно вообще на первый взгляд не понятно как эта штука работает
- Метод modify позволяет только отредактировать один статус, а их в самой моделе массив. Плюс тип у параметра `customStatus` не расписан (надо гадать).
- У кастомного статуса свой набор цветов `StatusColorEnum`, хотя уже существует расширенный набор цветов `ColorEnum`. Специально два разных типа, или просто дубль?

## Заводим CustomFields

- ❓ А где метод удаления?

## Заводим Comments

- Объединяем GET endpoint's в один (ставим taskId, folderId в параметры фильтра)
- Для списка комментов, нет сортировки, нет пагинации
- А вообще есть ли полнотекстовый поиск в АПИ 🤔
- Нет возможности получить реакции к комментарию через АПИ

## Заводим Task Dependencies

- Методы не проверены, т.к. нет премиум доступа

## Заводим Timelog categories

- Странно что через API нет возможности завести свои категории

## Заводим TimeLogs

- Чем ProjectContractTypeEnum (в Folders) отличается от BillingTypeEnum (в Timelogs)?
- 🤯🤯🤯 Что трекается только по целым часам? И почему диапазон от 0 до 24? Клиенты наверняка страдают от такого негибкого трекинга.
- Объединяем 5 ендпоинтов в один через фильтр по полям folderId, taskId, contactId, timelogCategoryId.
- GET /timelog_categories/{timelog_categoryId}/timelogs содержит параметр `timelogCategories`. Странно это.
- При создании и редактировании параметр plainText и fields не относятся к редактируемому объекту и должны быть вынесены из Input типа.
- ❗️ Странно что trackedDate пишем в формате yyyy-MM-dd, а ищем в формате yyyy-MM-dd'T'HH:mm:ss'Z'

## Заводим Attachments

- Ну вот тут пришло время работать с бинарниками – тут GraphQL не нужен!!! Не реализовываем методы create, modify, download. 🤘
- 🛑🤔 А где endpoint по работе с `Review`? `ReviewID` есть, а ендпоинта нет.
- Странно но в описании не подставили типы для taskId, folderId, commentId (до последнего думал что апи сгенерировано, но оказца аккуратно все написано руками)
- Да, много где встречаю по АПИ, что поле required но его может не быть, если приходит другое поле. Например либо taskId, folderId и commentId. В любом случае эти поля уже опциональны. previewUrl тоже опциональный.
- Когда запрашиваем `url` и его не вернул сервер (например через /attachments/{attachmentId},{attachmentId}) то делаем подзапрос, чтоб получить урл на /attachments/{attachmentId}/url

## Добавляем ендпоинт Version

- Странно что под текущую 4ую версию возвращается `{ major: 1 minor: 0}`
- Добавляем вычисляемое поле `full`
- Вжух, и готово за 1 минуту

## Добавляем ендпоинт Colors

- Вжух, и готово за 30 секунд

## Добавляем ендпоинт DataExport

- Доступен только на интерпрайзе
- Сперва подумал, что зря все схемы руками состовлял. Можно было сгенерить GraphQL-схему из этих файлов. Но по доке увидел что не все Ентити заведены и всего 4 базовых типа. Получилась бы кака схема, и без привязки к эндпоинтам.

## Добавляем Audit Log

- Нет интерпрайз доступа, метод не проверен.

## Добавляем Approvals

- Опять taskId и folderId required-поля, хотя может быть только одно.
- Забыли добавить поле `id` в описание Response
- В APPROVAL DECISION описане начинает со строчной буквы. Реально везде с прописной, а тут со строчной - во мне перфекционист плачет 😜
- ❓ А как вообще заапрувить Апрувалс??? Не нашел способа в публичном апи, либо не понял. Т.е. я могу себя добавить в Approvers, но не могу поставить статус для своего апрува.
- Метод Update разбил на 5 GraphQL-методов, основной и addApprovers, removeApprovers, addAttachments, removeAttachments
- Странно что пагинация есть, а сортировки нет.

## Добавляем Work Schedules

- `workweek` плохо расписан тип возвращаемых данных
- Обновление workweek разнес на 3 мутации – update, addUsers, removeUsers
- Не удалось протестировать методы, т.к. ограничения по аккаунту

## Добавляем Work Schedule exceptions

- Странно но endpoint называется `exclusions`. Чревато опечатками.

## Добавляем даталоадеры

Даталоадеры позволяют решить проблему N+1 и сократить кол-во HTTP запросов к REST API.

- Находим 9 entity которые имеют findByIds метод
- Пишем генераторы DataLoader'ов
  - 8 глобальных (записи возвращаются полностью, смело можно использовать глобально в рамках запроса)
  - 4 fieldNode-specific дата-лоадера (зависят от запрошенных полей в запросе)
- Пишем генераторы резолверов `resolveManyViaDL` и `resolveOneViaDL`
- Подключаем к TaskTC наши генераторы даталоадеров (старые методы комментируем для примера)

## Создаем Relations (генераторы FieldConfig'ов)

Relations/Резолверы позволяют избавиться от копипасты. Позволяют расширять логику, например добавлять аргументы, оборачивать в даталоадеры и пр.

- Создал 14 резолверов (генераторов FieldConfig)
- Резолверы по-умолчанию используют Даталоадеры (можно отключить через `DISABLE_DATALOADERS`)
- Подцепил резолверы по прямым связям ко всем Entity - `49 штук` (можно отключить через `DISABLE_RELATIONS`)
  - Пару связей уже было в РЕСТ АПИ, например `Folder.customFields`
- Прикрутил обратных связей по id – `25 штук` (можно отключить через `DISABLE_BACK_RELATIONS`)
- Рсширяем дополнительными аргументами реляции:
  - getRelationApprovalsByApproverUserId
  - getRelationApprovalsByPendingApproverUserId
  - getRelationAttachmentsByFolderId
  - getRelationAttachmentsByTaskId
  - getRelationFoldersBySpaceId
  - getRelationTasksBySpaceId
  - getRelationTasksByResponsibleId
  - getRelationTasksByAuthorId
  - getRelationTasksByFolderId
  - getRelationTasksBySpaceId
  - getRelationTimelogsByContactId
  - getRelationTimelogsByFolderId
  - getRelationTimelogsByTaskId
  - getRelationTimelogsByTimelogCategoryId
  - getRelationUserScheduleExclusionByUserId

## Крутим QueryCost

Создали плагин к аполло серверу `queryCostPlugin` и подключили его.

QueryCost отрабатывает перед запуском выполнения запроса. Фактически мы пытаемся посчитать максимально возможно кол-во полей, которое вернет сервер, исходя из запроса и переданных переменных.
И если он будет больше 10000, как в нашем примере, то пользователю вернется ошибка. 

- Добавлять `complexity` к релейшенам, которые возвращают списки
  - плохо, что не везде есть лимиты и сортировки (аттачменты, комменты) и мы запрашиваем тупо по ID
  - если нет аргументов limit или pageSize, то ставим `extensions: { complexity: ({ childComplexity }) => childComplexity * 10 }` (считаем что в списках в среднем возвращается 10 элементов)
  - 🛑 особенно печально, что поиск Folders нельзя итерировать. И чер его знает сколько там може вернуться записей, поэтому тяжело спрогнозировать сложность запроса.
  - ☝️ Везде где используется `childComplexity * 10` (без учета аргументов) крайне важно прикрутить лимиты. Иначе есть риск потерять сервер если прилетит мааааленький запрос, но с большой вложенностью – то серверу может не хватить памяти его обработать.
- Добавляем `complexity` ко всем полям Query (точкам входа в наш граф)
  - для finsByIds есть возможность посчитать кол-во запрошенных данных (например query.approvalByIds). А вот релейшенах такой возможности нет, т.к. надо сперва выполнить запрос, чтоб узнать сколько записей будет запрошено.
  - 🛑🛑🛑 неее ну вы серьезно вернете мне миллион моих аттачментов, если я сделаю запрос `GET /attachments`. Камон, нужно везде крутить лимиты и не вываливать на бедную голову фронта километровые ответы, нехай пагинирует если ему всё надо.

## Крутим авторизацию

- Пробрасываем Authorizaition заголовок, а также куки (на вырост) в контекст. Затем этот контекст пробрасываем в axios, чтоб он мог их использовать в своих подзапросах.
- 🔥 Боль и печаль – пришлось отредактировать больше 200 файлов. Надо сразу заводить.

## Собираем Docker образ

```bash
docker build -t nodkz/wrike-graphql .
docker push nodkz/wrike-graphql:latest
docker run -it --rm wrike-graphql:latest /bin/sh

yarn docker-build
```

RUN VIA

```bash
docker run --rm -p 3000:3000 -e AUTH_TOKEN="XXXX" docker.io/nodkz/wrike-graphql:latest
```

## Деплой на Heroku

```bash
heroku login
heroku container:login
heroku container:push web -a graphql-wrike
heroku container:release web -a graphql-wrike
```

## Добавки

- Добавить кастомные поля с привязкой к гитхабу. Например к коммитам для прикручивания федерации. В другой раз, не расспыляемся на федерацию/mesh.
- Сделать пример для нового v4 АПИ (идея была собрать на АполлеКлиенте простенькое приложение. Но и так было потрачено на все апи нереально много времени. В топку идею.)
- Заюзать Web-hooks для сабкрипшенов (лажа, нужен полноценный PubSub. Что если запущено 5 инстансов сервера? Нужно деплоить пример и потом вязать хуки в аккаунте – костыльно как-то. Нет смысла неправильным вещам учить людей).

## Разные попутные мысли в ходе разработки (не относится к апи райка)

- Когда обарачивал Task по response Json, то упустил кучу специфичных полей и получил неполное описание типа (упустил CustomFields, recurrent, dependencies потерял документацию)

- Микросервисная боль: Несколько сервисов необходимо вызывать, чтобы создать пользовательский аккаунт, назначить права, создать саб-аккаунт. Печально если ваши клиенты занимаются таким колхозом.

- ВАЖНАЯ МЫСЛЬ: бэкендеры привыкли подстраивать РЕСТ АПИ под текущие требования приложения. Зачастую АПИ не готово под новые требования фронтендеров (еще чаще сами фронтендеров тупят, не зная что оказца можно запросить). К примеру, Графкуэль позволяет описать все связи между сущностями; что позволяет клиенту запросить любые связные данные под его задачу не дожидаясь бэкендера. Например, нет возможности получить календарь для конкретного пользователя (сперва дергай все календари, затем перебором ищи в нем нужного пользователя, а потом только рисуй календарик). Т.е. проблема в передаче знаний о связях между Entities в вашей Data Domain.
