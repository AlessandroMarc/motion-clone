# Motion API Specification

This specification outlines the endpoints, data types, and limitations for integrating with the Motion API.

**Base URL:** `https://api.usemotion.com/v1`

---

## 1. Authentication & Limitations

All requests require authorization using an API key passed in the request header.

### Authentication Header
| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `X-API-Key` | string | Yes | Your unique API key generated from the Motion Settings tab. |

### Rate Limits
| Tier | Limit |
| :--- | :--- |
| **Individual** | 12 requests per minute |
| **Team** | 120 requests per minute |
| **Enterprise** | Custom (Contact Support) |

---

## 2. Core Concepts: Frequencies

When scheduling recurring tasks, days must be defined using the specific codes: `MO`, `TU`, `WE`, `TH`, `FR`, `SA`, `SU`. An array of days (e.g., `[MO, FR, SU]`) must always be appended to a frequency type prefix.

### Frequency Types
| Frequency | Valid Formats |
| :--- | :--- |
| **Daily** | `daily_every_day`, `daily_every_week_day`, `daily_specific_days_DAYS_ARRAY` |
| **Weekly** | `weekly_any_day`, `weekly_any_week_day`, `weekly_specific_days_DAYS_ARRAY` |
| **Bi-Weekly** | `biweekly_first_week_specific_days_DAYS_ARRAY`, `biweekly_first_week_any_day`, `biweekly_first_week_any_week_day`, `biweekly_second_week_any_day`, `biweekly_second_week_any_week_day` |
| **Monthly** | `monthly_first_DAY`, `monthly_second_DAY`, `monthly_third_DAY`, `monthly_fourth_DAY`, `monthly_last_DAY`, `monthly_1` through `monthly_31` (defaults to last day if month is shorter), `monthly_any_day_first_week`, `monthly_any_week_day_last_week`, `monthly_last_day_of_month`, `monthly_any_week_day_of_month`, `monthly_any_day_of_month` |
| **Quarterly** | `quarterly_first_day`, `quarterly_first_week_day`, `quarterly_first_DAY`, `quarterly_last_day`, `quarterly_last_week_day`, `quarterly_last_DAY`, `quarterly_any_day_first_week`, `quarterly_any_day_second_week`, `quarterly_any_day_last_week`, `quarterly_any_day_first_month`, `quarterly_any_day_second_month` |

---

## 3. Endpoints & Schemas

### Users

#### Get My User
Retrieves information on the owner of the API key.
* **Method:** `GET`
* **Route:** `/users/me`

**Response (200 - application/json - object)**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | The user ID. |
| `name` | string | No | The name of the user. |
| `email` | string | Yes | The email of the user. |

---

### Workspaces

#### List Workspaces
Get a list of workspaces a user is a part of.
* **Method:** `GET`
* **Route:** `/workspaces`

**Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cursor` | string | No | Paging cursor from a previous request. |
| `ids` | array<string> | No | Expand details of specific workspaces. |

**Response (200 - application/json - object)**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `meta` | object | Yes | Contains `nextCursor` and `pageSize`. |
| `workspaces` | array<object> | Yes | Array of workspace objects. |

---

### Projects

#### Get Project
Get a single project by ID.
* **Method:** `GET`
* **Route:** `/projects/{id}`

**Path Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | The ID of the project to return. |

**Response (200 - application/json - object)**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | The ID of the project. |
| `name` | string | Yes | The name of the project. |
| `description` | string | Yes | HTML contents of the description. |
| `workspaceId` | string | Yes | The ID of the workspace. |
| `status` | object | No | The status of the project. |
| `createdTime` | datetime | No | Timestamp of creation. |
| `updatedTime` | datetime | No | Timestamp of last update. |
| `customFieldValues` | record<object> | No | Record of custom field values (text, number, url, date, select, multiSelect, person, multiPerson, email, phone, checkbox, relatedTo). |

#### List Projects
Get all projects for a workspace.
* **Method:** `GET`
* **Route:** `/projects`

**Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cursor` | string | No | Paging cursor. |
| `workspaceId` | string | No | Filter projects by workspace. |

**Response (200 - application/json - object)**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `meta` | object | Yes | Pagination metadata. |
| `projects` | array<object> | No | Array containing project objects (schema matches "Get Project"). |

---

### Tasks

#### Get Task
Get a specific task by ID.
* **Method:** `GET`
* **Route:** `/tasks/{id}`

**Response (200 - application/json - object)**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | string | Yes | Task ID. |
| `name` | string | Yes | Task name. |
| `description` | string | Yes | HTML contents of description. |
| `duration` | string/number | No | Minutes (>0), "NONE", or "REMINDER". |
| `dueDate` | datetime | No | When the task is due. |
| `deadlineType` | string | Yes | HARD, SOFT (default), or NONE. |
| `parentRecurringTaskId` | string | Yes | Parent ID if part of a recurring task. |
| `completed` | boolean | Yes | Completion status. |
| `completedTime` | datetime | No | Completion timestamp. |
| `updatedTime` | datetime | No | Last update timestamp. |
| `startOn` | string | No | Start date (YYYY-MM-DD). |
| `creator` | object | Yes | User who created the task. |
| `project` | object | No | Project data. |
| `workspace` | object | Yes | Workspace data. |
| `status` | object | Yes | Status of the task. |
| `priority` | string | Yes | ASAP, HIGH, MEDIUM, or LOW. |
| `labels` | array<object> | Yes | Array of labels. |
| `assignees` | array<object> | Yes | Array of assignees. |
| `scheduledStart` | datetime | No | Motion's scheduled start time. |
| `createdTime` | datetime | Yes | Creation timestamp. |
| `scheduledEnd` | datetime | No | Motion's scheduled end time. |
| `schedulingIssue` | boolean | Yes | True if Motion failed to schedule. |
| `lastInteractedTime` | datetime | No | Last interaction timestamp. |
| `customFieldValues` | record<object> | No | Custom field values. |
| `chunks` | array<object> | No | Scheduling chunks. |

#### List Tasks
Get all tasks for a given query.
* **Method:** `GET`
* **Route:** `/tasks`

**Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `assigneeId` | string | No | Filter by assignee. |
| `cursor` | string | No | Paging cursor. |
| `includeAllStatuses` | boolean | No | Cannot specify alongside `status`. |
| `label` | string | No | Filter by label. |
| `name` | string | No | Case-insensitive string search. |
| `projectId` | string | No | Filter by project. |
| `status` | array<string> | No | Cannot specify alongside `includeAllStatuses`. |
| `workspaceId` | string | No | Defaults to all workspaces user is in. |

**Response (200 - application/json - object)**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `meta` | object | Yes | Pagination metadata. |
| `tasks` | array<object> | Yes | Array of task objects. |

---

### Recurring Tasks

#### List Recurring Tasks
Get all recurring tasks for a workspace.
* **Method:** `GET`
* **Route:** `/recurring-tasks`

**Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cursor` | string | No | Paging cursor. |
| `workspaceId` | string | Yes | The workspace to query. |

**Response (200 - application/json - object)**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `meta` | object | Yes | Pagination metadata. |
| `tasks` | array<object> | Yes | Array containing recurring task objects (includes `id`, `name`, `creator`, `assignee`, `project`, `status`, `priority`, `labels`, `workspace`). |

---

### Schedules & Statuses

#### Get Schedules
Get a list of schedules for your user.
* **Method:** `GET`
* **Route:** `/schedules`

**Response (200 - application/json - array of objects)**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | string | Yes | The name of the schedule. |
| `isDefaultTimezone` | boolean | Yes | Default timezone flag. |
| `timezone` | string | Yes | Timezone string. |
| `schedule` | object | Yes | Details start/end times per day (`monday` through `sunday` arrays). |

#### Get Statuses
Get a list of statuses for a particular workspace.
* **Method:** `GET`
* **Route:** `/statuses`

**Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `workspaceId` | string | No | Filter by workspace. |

**Response (200 - application/json - array of objects)**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | string | No | Status name. |
| `isDefaultStatus` | boolean | No | Default status flag. |
| `isResolvedStatus` | boolean | No | Resolved (terminated) status flag. |
