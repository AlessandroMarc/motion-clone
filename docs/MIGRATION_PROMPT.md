Help me build an md file to support my repo that has to integrate with the following API

1Create API Key

Log into Motion and under the Settings tab, create an API key. Be sure to copy the key, as it will only be shown once for security reasons.

2Set Authorization Headers

Pass in your API key as a X-API-Key header.

3Test the API

Try sending a GET request to https://api.usemotion.com/v1/workspaces with your api key as a header!

API Docs

Frequency

Days

Defining days should always be used along with a specific frequency type as defined below. An array of days should never be used on its own. See examples below.

When picking a set of specific week days, we expect it to be defined as an array with a subset of the following values.

MO - Monday

TU - Tuesday

WE - Wednesday

TH - Thursday

FR - Friday

SA - Saturday

SU - Sunday

For example, [MO, FR, SU] would mean Monday, Friday, and Sunday.

Defining a Daily Frequency

daily_every_day

daily_every_week_day

daily_specific_days_DAYS_ARRAY

For example, daily*specific_days*[MO, TU, FR] means every Monday, Tuesday, and Friday.

Defining a Weekly Frequency

weekly_any_day

weekly_any_week_day

weekly_specific_days_DAYS_ARRAY

For example, weekly*specific_days*[MO, TU, FR] means once a week, on Monday, Tuesday or Friday.

Defining a Bi-Weekly Frequency

biweekly_first_week_specific_days_DAYS_ARRAY

biweekly_first_week_any_day

biweekly_first_week_any_week_day

biweekly_second_week_any_day

biweekly_second_week_any_week_day

For example, biweekly*first_week_specific_days*[MO, TU, FR] means biweekly on the first week, on Mondays, Tuesdays or Fridays.

Defining a Monthly Frequency

Specific Week Day Options

When choosing the 1st, 2nd, 3rd, 4th or last day of the week for the month, it takes the form of any of the following where DAY can be substituted for the day code mentioned above.

monthly_first_DAY

monthly_second_DAY

monthly_third_DAY

monthly_fourth_DAY

monthly_last_DAY

For example, monthly_first_MO means the first Monday of the month.

Specific Day Options

In the case you choose a numeric value for a month that does not have that many days, we will default to the last day of the month.

When choosing a specific day of the month, for example the 6th, it would be defined with just the number like below.

monthly_1

monthly_15

monthly_31

Specific Week Options

Any Day

monthly_any_day_first_week

monthly_any_day_second_week

monthly_any_day_third_week

monthly_any_day_fourth_week

monthly_any_day_last_week

Any Week Day

monthly_any_week_day_first_week

monthly_any_week_day_second_week

monthly_any_week_day_third_week

monthly_any_week_day_fourth_week

monthly_any_week_day_last_week

Other Options

monthly_last_day_of_month

monthly_any_week_day_of_month

monthly_any_day_of_month

Defining a Quarterly Frequency

First Days

quarterly_first_day

quarterly_first_week_day

quarterly_first_DAY

For example, quarterly_first_MO means the first Monday of the quarter.

Last Days

quarterly_last_day

quarterly_last_week_day

quarterly_last_DAY

For example, quarterly_last_MO means the last Monday of the quarter.

Other Options

quarterly_any_day_first_week

quarterly_any_day_second_week

quarterly_any_day_last_week

quarterly_any_day_first_month

quarterly_any_day_second_month

Rate limits

The base tier for individuals is 12 requests per minute.

Teams can request up to 120 requests per minute.

For even higher rate limits, please sign up for our enterprise tier.

API Docs

Get project

Get a single project, given an ID.

GET

/

v1

/

projects

/

{id}

Authorization

X-API-Key

string

required

Header with the name X-API-Key where the value is your API key.

Path parameters

id

string

required

The ID of the project to return.

Response

200 - application/json - object

id

string

required

The ID of the project.

name

string

required

The name of the project.

description

string

required

The HTML contents of the description.

workspaceId

string

required

The ID of the workspace.

status

object

The status of the project.

Show child attributes

createdTime

datetime

The timestamp when the project was created.

updatedTime

datetime

The timestamp when the project was last updated.

customFieldValues

record<object>

Record of custom field values for the entity, where each key is the name of the custom field (not the ID). Each object contains a "type" discriminator and a "value" property that varies based on the field type.

Hide child attributes

text

object

Text custom field value.

Show child attributes

number

object

Number custom field value.

Show child attributes

url

object

URL custom field value.

Show child attributes

date

object

Date custom field value.

Show child attributes

select

object

Select custom field value.

Show child attributes

multiSelect

object

Multi-select custom field value.

Show child attributes

person

object

Person custom field value.

Show child attributes

multiPerson

object

Multi-person custom field value.

Show child attributes

email

object

Email custom field value.

Show child attributes

phone

object

Phone custom field value.

Show child attributes

checkbox

object

Checkbox custom field value.

Show child attributes

relatedTo

object

Related task custom field value.

Show child attributes

vAPI Docs

List projects

Get all projects for a workspace.

GET

/

v1

/

projects

Authorization

X-API-Key

string

required

Header with the name X-API-Key where the value is your API key.

Query parameters

cursor

string

Use if a previous request returned a cursor. Will page through results.

workspaceId

string

The workspace for which all projects should be returned.

Response

200 - application/json - object

meta

object

required

Contains the nextCursor, if one exists, along with the pageSize.

Show child attributes

projects

array<object>

The projects returned.

Hide child attributes

id

string

required

The ID of the project.

name

string

required

The name of the project.

description

string

required

The HTML contents of the description.

workspaceId

string

required

The ID of the workspace.

status

object

The status of the project.

Show child attributes

createdTime

datetime

The timestamp when the project was created.

updatedTime

datetime

The timestamp when the project was last updated.

customFieldValues

record<object>

Record of custom field values for the entity, where each key is the name of the custom field (not the ID). Each object contains a "type" discriminator and a "value" property that varies based on the field type.

Show child attributes

API Docs

List recurring tasks

Get all recurring tasks for a workspace.

GET

/

v1

/

recurring-tasks

Authorization

X-API-Key

string

required

Header with the name X-API-Key where the value is your API key.

Query parameters

cursor

string

Use if a previous request returned a cursor. Will page through results.

workspaceId

string

required

The workspace for which all recurring tasks should be returned.

Response

200 - application/json - object

meta

object

required

Contains the nextCursor, if one exists, along with the pageSize.

Show child attributes

tasks

array<object>

required

Recurring tasks for the workspace.

Hide child attributes

id

string

required

The ID of the recurring task.

name

string

required

The name of the recurring task.

creator

object

required

The user who created the recurring task.

Show child attributes

assignee

object

required

The user assigned to the recurring task.

Show child attributes

project

object

The project data.

Show child attributes

status

object

required

The status of the recurring task.

Show child attributes

priority

string

required

Valid options are ASAP, HIGH, MEDIUM, or LOW.

labels

array<object>

required

An array of labels.

Show child attributes

workspace

object

required

The workspace data.

Show child attributes

API Docs

List recurring tasks

Get all recurring tasks for a workspace.

GET

/

v1

/

recurring-tasks

Authorization

X-API-Key

string

required

Header with the name X-API-Key where the value is your API key.

Query parameters

cursor

string

Use if a previous request returned a cursor. Will page through results.

workspaceId

string

required

The workspace for which all recurring tasks should be returned.

Response

200 - application/json - object

meta

object

required

Contains the nextCursor, if one exists, along with the pageSize.

Show child attributes

tasks

array<object>

required

Recurring tasks for the workspace.

Hide child attributes

id

string

required

The ID of the recurring task.

name

string

required

The name of the recurring task.

creator

object

required

The user who created the recurring task.

Show child attributes

assignee

object

required

The user assigned to the recurring task.

Show child attributes

project

object

The project data.

Show child attributes

status

object

required

The status of the recurring task.

Show child attributes

priority

string

required

Valid options are ASAP, HIGH, MEDIUM, or LOW.

labels

array<object>

required

An array of labels.

Show child attributes

workspace

object

required

The workspace data.

Show child attributes

API Docs

Get schedules

Get a list of schedules for your user.

GET

/

v1

/

schedules

Authorization

X-API-Key

string

required

Header with the name X-API-Key where the value is your API key.

Response

200 - application/json - array

name

string

required

The name of the schedule.

isDefaultTimezone

boolean

required

Whether the schedule is the default timezone.

timezone

string

required

The timezone of the schedule.

schedule

object

required

The schedule details.

Hide child attributes

monday

array<object>

An array of objects detailing start and end times.

Show child attributes

tuesday

array<object>

An array of objects detailing start and end times.

Show child attributes

wednesday

array<object>

An array of objects detailing start and end times.

Show child attributes

thursday

array<object>

An array of objects detailing start and end times.

Show child attributes

friday

array<object>

An array of objects detailing start and end times.

Show child attributes

saturday

array<object>

An array of objects detailing start and end times.

Show child attributes

sunday

array<object>

An array of objects detailing start and end times.

Show child attributes

API Docs

Get statuses

Get a list of statuses for a particular workspace.

GET

/

v1

/

statuses

Authorization

X-API-Key

string

required

Header with the name X-API-Key where the value is your API key.

Query parameters

workspaceId

string

Get statuses for a particular workspace.

Response

200 - application/json - array

status

object

required

The status of the item.

Hide child attributes

name

string

The name of the status.

isDefaultStatus

boolean

Whether this status is a default status for the workspace.

isResolvedStatus

boolean

Whether this is a resolved (terminated) status for the workspace.

API Docs

Get task

Get a task.

GET

/

v1

/

tasks

/

{id}

Authorization

X-API-Key

string

required

Header with the name X-API-Key where the value is your API key.

Path parameters

id

string

The id of the task to fetch.

Response

200 - application/json - object

id

string

required

The ID of the task.

name

string

required

The name of the task.

description

string

required

The HTML contents of the description.

duration

string | number

An integer greater than 0 (representing minutes), "NONE", or "REMINDER".

dueDate

datetime

When is the task due.

deadlineType

string

required

Values are HARD, SOFT (default) or NONE.

parentRecurringTaskId

string

required

If this is an instance of a recurring task, this field will be the parent recurring task id.

completed

boolean

required

Whether the task is completed or not.

completedTime

datetime

The timestamp when the task was completed.

updatedTime

datetime

The timestamp when the task was last updated.

startOn

string

Date indicating when a task should start, in YYYY-MM-DD format.

creator

object

required

The user who created the task.

Show child attributes

project

object

The project data.

Show child attributes

workspace

object

required

The workspace data.

Show child attributes

status

object

required

The status of the The status of the task.

Show child attributes

priority

string

required

Valid options are ASAP, HIGH, MEDIUM, or LOW.

labels

array<object>

required

An array of labels.

Show child attributes

assignees

array<object>

required

An array of assignees.

Show child attributes

scheduledStart

datetime

The time that motion has scheduled this task to start.

createdTime

datetime

required

The time that the task was created.

scheduledEnd

datetime

The time that motion has scheduled this task to end.

schedulingIssue

boolean

required

Returns true if Motion was unable to schedule this task. Check Motion directly to address.

lastInteractedTime

datetime

The timestamp when the task was last interacted with.

customFieldValues

record<object>

Record of custom field values for the entity, where each key is the name of the custom field (not the ID). Each object contains a "type" discriminator and a "value" property that varies based on the field type.

Show child attributes

chunks

array<object>

Array of scheduling chunks for the task.

Show child attributes

API Docs

List tasks

Get all tasks for a given query.

GET

/

v1

/

tasks

Authorization

X-API-Key

string

required

Header with the name X-API-Key where the value is your API key.

Query parameters

assigneeId

string

Limit tasks returned to a specific assignee.

cursor

string

Use if a previous request returned a cursor. Will page through results.

includeAllStatuses

boolean

Limit tasks returned by statuses that exist on tasks, cannot specify this ('includeAllStatuses') AND status in the same request.

label

string

Limit tasks returned by label on the task.

name

string

Limit tasks returned to those that contain this string. Case in-sensitive.

projectId

string

Limit tasks returned to a given project.

status

array<string>

Limit tasks returned by statuses that exist on tasks, cannot specify this ('status') AND includeAllStatuses in the same request

workspaceId

string

The id of the workspace you want tasks from. If not provided, will return tasks from all workspaces the user is a member of.

Response

200 - application/json - object

meta

object

required

Contains the nextCursor, if one exists, along with the pageSize.

Show child attributes

tasks

array<object>

required

The tasks returned.

Show child attributes

API Docs

List workspaces

Get a list of workspaces a user is a part of.

GET

/

v1

/

workspaces

Authorization

X-API-Key

string

required

Header with the name X-API-Key where the value is your API key.

Query parameters

cursor

string

Use if a previous request returned a cursor. Will page through results.

ids

array<string>

Expand details of specific workspaces, instead of getting all of them.

Response

200 - application/json - object

meta

object

required

Contains the nextCursor, if one exists, along with the pageSize.

Show child attributes

workspaces

array<object>

required

An array of workspace objects.

Show child attributes

API Docs

Get my user

Get information on the owner of this API key.

GET

/

v1

/

users

/

me

Authorization

X-API-Key

string

required

Header with the name X-API-Key where the value is your API key.

Response

200 - application/json - object

id

string

required

The user ID.

name

string

The name of the user.

email

string

required

The email of the user.
