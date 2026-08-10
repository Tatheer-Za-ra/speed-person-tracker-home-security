# Module Checklist

## 1. Auth
**Purpose:** Handle user signup, login, logout, and protected access.  
**Needed because:** The app should not be open to everyone.  
**Main outputs:** authenticated user session.

## 2. Config
**Purpose:** Store system settings like speed thresholds.  
**Needed because:** overspeed detection depends on configurable limits.  
**Main outputs:** threshold values used by AI/event logic.

## 3. Known Persons
**Purpose:** Manage saved people for known vs unknown recognition.  
**Needed because:** face recognition cannot work without a known-person database.  
**Main outputs:** known person records and face reference data.

## 4. Video Upload
**Purpose:** Upload one or more CCTV videos into the system.  
**Needed because:** uploaded videos are the main input of the whole project.  
**Main outputs:** stored video file + video record in database.

## 5. Processing Queue
**Purpose:** Handle videos in queued/background processing mode.  
**Needed because:** video analysis can take time and should not block the UI.  
**Main outputs:** queued, processing, completed, failed statuses.

## 6. AI Pipeline
**Purpose:** Process video frames to detect people/vehicles, track them, identify known vs unknown persons, and estimate speed.  
**Needed because:** this is the core intelligence of the project.  
**Main outputs:** detections, tracks, identities, speed values.

## 7. Timeline
**Purpose:** Show generated events in chronological order.  
**Needed because:** users need to review what happened in each processed video.  
**Main outputs:** filterable event list.

## 8. Alerts
**Purpose:** Highlight important events like unknown persons and overspeed vehicles.  
**Needed because:** not every event is equally important.  
**Main outputs:** alert list for quick attention.

## 9. Summary
**Purpose:** Show dashboard counts and quick overview.  
**Needed because:** users should understand the system output at a glance.  
**Main outputs:** totals, latest stats, key counts.

## 10. Reports
**Purpose:** Export processed results into downloadable files.  
**Needed because:** reports are part of the final project output and review process.  
**Main outputs:** CSV/PDF style reports.

## 11. Logs
**Purpose:** Keep history of processed videos and processing results.  
**Needed because:** users need traceability and debugging visibility.  
**Main outputs:** processing history and failure details.