# API Planning

## Auth
- **POST /api/auth/signup**  
  Purpose: create user account  
  Request: name, email, password  
  Response: created user / success message

- **POST /api/auth/login**  
  Purpose: log user in  
  Request: email, password  
  Response: user session / success message

- **POST /api/auth/logout**  
  Purpose: log user out  
  Request: none  
  Response: success message

- **GET /api/auth/me**  
  Purpose: get currently logged-in user  
  Request: none  
  Response: user details

## Config
- **GET /api/config/speed-thresholds**  
  Purpose: fetch current speed threshold settings  
  Request: none  
  Response: threshold values

- **PUT /api/config/speed-thresholds**  
  Purpose: update speed threshold settings  
  Request: threshold values  
  Response: updated config

## Known Persons
- **GET /api/known-persons**  
  Purpose: list all known persons  
  Request: optional filters  
  Response: list of persons

- **POST /api/known-persons**  
  Purpose: add a known person  
  Request: name, image  
  Response: created person

- **GET /api/known-persons/:id**  
  Purpose: get one known person  
  Request: none  
  Response: person details

- **PUT /api/known-persons/:id**  
  Purpose: update known person  
  Request: updated name/image  
  Response: updated person

- **DELETE /api/known-persons/:id**  
  Purpose: delete known person  
  Request: none  
  Response: success message

## Videos
- **POST /api/videos/upload**  
  Purpose: upload one or more CCTV videos  
  Request: video file(s)  
  Response: upload result + created video records

- **GET /api/videos**  
  Purpose: list uploaded videos  
  Request: optional filters  
  Response: list of videos

- **GET /api/videos/:id**  
  Purpose: get one video detail  
  Request: none  
  Response: video metadata

- **GET /api/videos/:id/status**  
  Purpose: check processing status of a video  
  Request: none  
  Response: queued / processing / completed / failed

- **POST /api/videos/:id/reprocess**  
  Purpose: run processing again on a video  
  Request: none  
  Response: new processing job status

## Events / Timeline
- **GET /api/events**  
  Purpose: list timeline events  
  Request: filters like type, date, video, identity, vehicle category  
  Response: paginated event list

- **GET /api/events/:id**  
  Purpose: get one event detail  
  Request: none  
  Response: event details

## Alerts
- **GET /api/alerts**  
  Purpose: list alert events only  
  Request: optional filters  
  Response: alert list

- **GET /api/alerts/:id**  
  Purpose: get one alert detail  
  Request: none  
  Response: alert details

## Summary
- **GET /api/summary**  
  Purpose: show dashboard overview  
  Request: optional date range  
  Response: total videos, total events, total alerts, etc.

## Reports
- **POST /api/reports/export**  
  Purpose: generate export report  
  Request: format + filters  
  Response: report file / download path

## Logs
- **GET /api/logs**  
  Purpose: list processing logs  
  Request: optional filters  
  Response: log list

- **GET /api/logs/:id**  
  Purpose: get one processing log  
  Request: none  
  Response: log detail

- **DELETE /api/logs/:id**  
  Purpose: delete a processing log  
  Request: none  
  Response: success message