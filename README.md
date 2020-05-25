
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

## Заводим User

Документация АПИ метода <https://developers.wrike.com/documentation/api/methods/query-user>

### Создаем user/findById.ts

- Можно запросить одного пользователя, но возвращает массив (может )
- Пишем простой тест

### Заводим UserTC в GraphQL-схему

- создаем `UserTC.ts`
- в схему добавляем `userById`
- в `TaskTC` добавляем новые поля (связи), которые будут возвращать пользователей:
  - shareds
  - responsibles
  - authors
  - followers
  - TODO: добавить DataLoader
- в `UserTC` добавляем новые поля (связи), которые будут возвращать таски
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
- ❓Не описаны типы для 10 полей, которые возвращаются через `fields`
- `Note: when any of query filter parameters are present (e.g. descendants=false, metadata) response is switched to Folder model.` – эта штука убивает при поиске 10 полей, которые возвращаются через `fields`. Понятно что нагрузка, но надо посмотреть как вернуть для `descendants=true`
- Что такое `customColumnIds` и как оно коррелирует с `customFieldIds`?
- Печально что папка не возвращает массив родителей 😢
- Кстати, нельзя при создании папки указать несколько родителей. А при редактировании можно.
- Завел отдельные мутации для `addParents`, `removeParents`, `addShareds`, `removeShareds`
- Заводим асинхронное копирование папок (какое-то детское мак кол-во для копирования – 250)

## Заводим Workflow

- Честно вообще на первый взгляд не понятно как эта штука работает
- Метод modify позволяет только отредактировать один статус, а их в самой моделе массив. Плюс тип у параметра `customStatus` не расписан (надо гадать).
- У кастомного статуса свой набор цветов `StatusColorEnum`, хотя уже существует расширенный набор цветов `ColorEnum`. Специально два разных типа, или просто дубль?

## Заводим CustomFields

- А где метод удаления?

## Заводим Comments

- Объединяем GET endpoint's в один (ставим taskId, folderId в параметры фильтра)
- Для списка комментов, нет сортировки, нет пагинации
- А вообще есть ли полнотекстовый поиск в АПИ 🤔
- Нет возможности получить реакции к комментарию через АПИ
- TODO: добавить обратные связи с папками и тасками

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
- Странно что trackedDate пишем в формате yyyy-MM-dd, а ищем в формате yyyy-MM-dd'T'HH:mm:ss'Z'

## Заводим Attachments

- Ну вот тут пришло время работать с бинарниками – тут GraphQL не нужен!!! Не реализовываем методы create, modify, download. 🤘
- Странно но в описании не подставили типы для taskId, folderId, commentId (до последнего думал что апи сгенерировано, но оказца аккуратно все написано руками)
- Да, много где встречаю по АПИ, что поле required но его может не быть, если приходит другое поле. Например либо taskId, folderId и commentId. В любом случае эти поля уже опциональны. previewUrl тоже опциональный.
- Когда запрашиваем `url` и его не вернул сервер (например через /attachments/{attachmentId},{attachmentId}) то делаем позапрос, чтоб получить урл на /attachments/{attachmentId}/url

# TODO:

- Добавить кастомные поля с привязкой к гитхабу (например к коммитам для прекручивания федерации)
- Добавить Query cost
- Задеплоить на хероку
- Прикрутить DataLoader
- Сделать пример для нового v4 АПИ
- Заюзать Web-hooks для сабкрипшенов

# Проблема от Алексея (микросервисная боль):

- Несколькко сервисов необходимо вызывать, чтобы создать пользовательский аккаунт, назначить праваб создать саб-аккаунт.
