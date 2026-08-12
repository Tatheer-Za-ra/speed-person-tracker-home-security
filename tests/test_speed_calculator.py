# tests/test_speed_calculator.py

import unittest
from app.ai_pipeline.speed_calculator import calculate_track_speed, project_image_to_ground


class TestSpeedCalculator(unittest.TestCase):
    def test_legacy_flat_2d_speed_calculation(self):
        # 25 FPS video, 10 frames = 0.36 seconds
        fps = 25.0
        bbox_history = []

        for i in range(10):
            timestamp = i * (1.0 / fps)
            cx = 100 + i * 10  # 10 pixels per frame
            bbox_history.append({
                "timestamp_seconds": timestamp,
                "bbox": {
                    "x1": cx - 20,
                    "y1": 200,
                    "x2": cx + 20,
                    "y2": 250,
                }
            })

        result = calculate_track_speed(bbox_history, fps=fps, meters_per_pixel=0.045)

        self.assertTrue(result["valid"])
        self.assertAlmostEqual(result["estimated_speed_kmh"], 40.5, delta=2.5)
        self.assertGreater(result["max_speed_kmh"], 35.0)

    def test_3d_perspective_projection_ground_distance(self):
        # Coordinates near bottom of frame vs upper middle frame
        x1, y1 = 480.0, 450.0  # Bottom contact 1
        x2, y2 = 480.0, 420.0  # Bottom contact 2

        gx1, gy1 = project_image_to_ground(x1, y1, 960.0, 540.0, {"camera_height_m": 3.5, "camera_tilt_deg": 30.0, "fov_deg": 55.0})
        gx2, gy2 = project_image_to_ground(x2, y2, 960.0, 540.0, {"camera_height_m": 3.5, "camera_tilt_deg": 30.0, "fov_deg": 55.0})

        # Ground distance along depth (Y_ground) must be positive and non-zero
        self.assertGreater(gy2, gy1)
        depth_dist_m = gy2 - gy1
        self.assertGreater(depth_dist_m, 0.2)

    def test_3d_perspective_speed_calculation(self):
        fps = 25.0
        bbox_history = []

        # Vehicle moving down the driveway/road over 12 frames
        for i in range(12):
            timestamp = i * (1.0 / fps)
            y_bot = 300 + i * 12  # Moving towards camera
            bbox_history.append({
                "timestamp_seconds": timestamp,
                "bbox": {
                    "x1": 400,
                    "y1": y_bot - 80,
                    "x2": 560,
                    "y2": y_bot,
                },
                "processed_frame_width": 960,
                "processed_frame_height": 540,
            })

        cam_params = {
            "camera_height_m": 3.5,
            "camera_tilt_deg": 30.0,
            "fov_deg": 55.0,
            "scale_correction": 1.0
        }

        result = calculate_track_speed(bbox_history, fps=fps, camera_params=cam_params)

        self.assertTrue(result["valid"])
        self.assertGreater(result["estimated_speed_kmh"], 15.0)
        self.assertLess(result["estimated_speed_kmh"], 200.0)

    def test_method1_ai_self_calibration(self):
        # 25 FPS video over 12 frames
        # Car (1.85m width) with box width = 120px moving 15px per frame
        fps = 25.0
        bbox_history = []

        for i in range(12):
            timestamp = i * (1.0 / fps)
            cx = 200 + i * 15  # 15 pixels per frame
            bbox_history.append({
                "timestamp_seconds": timestamp,
                "bbox": {
                    "x1": cx - 60,  # Width = 120px
                    "y1": 300,
                    "x2": cx + 60,
                    "y2": 380,
                },
                "processed_frame_width": 960,
                "processed_frame_height": 540,
            })

        # Test AI Self-Calibration for car in residential scene mode
        result = calculate_track_speed(bbox_history, fps=fps, class_name="car", scene_preset="residential")

        self.assertTrue(result["valid"])
        # Scale = (1.85m / 120px) * 1.0 * (540/380)**1.0 = ~0.0154 m/px
        self.assertAlmostEqual(result["estimated_speed_kmh"], 20.8, delta=5.0)

    def test_insufficient_track_history(self):
        result = calculate_track_speed([], fps=25.0)
        self.assertFalse(result["valid"])
        self.assertEqual(result["estimated_speed_kmh"], 0.0)


if __name__ == "__main__":
    unittest.main()


