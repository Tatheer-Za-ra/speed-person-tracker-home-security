# Storage Rules

## Folder Structure
storage/
  uploads/
    videos/
  snapshots/
    events/
  known_persons/
    originals/
    processed/
  reports/
  temp/

## Rules
1. Uploaded CCTV videos must be stored in `storage/uploads/videos/`.
2. Event snapshots must be stored in `storage/snapshots/events/`.
3. Known person images must be stored separately in `storage/known_persons/`.
4. Generated reports must be stored in `storage/reports/`.
5. Temporary processing files must go in `storage/temp/`.
6. Database should store file paths, not full image/video binary data.
7. File writing should be handled by a storage service later, not scattered across the app.

## Naming Rules
- Video: `vid_<videoId>_<date>_<safeName>.mp4`
- Snapshot: `evt_<eventId>_vid_<videoId>_ts_<time>.jpg`
- Known person image: `kp_<knownPersonId>_<name>_<index>.jpg`
- Report: `report_<type>_<date>.pdf` or `.csv`

## Basic Retention
- Uploaded videos stay until deleted by user or cleanup policy
- Event snapshots stay linked with events
- Temp files can be deleted after processing finishes
- Reports can be regenerated later if needed