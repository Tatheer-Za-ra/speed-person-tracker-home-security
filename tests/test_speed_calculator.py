# tests/test_speed_calculator.py

import unittest
from app.ai_pipeline.speed_calculator import calculate_track_speed


class TestSpeedCalculator(unittest.TestCase):
    def test_speed_calculation_synthetic_trajectory(self):
        # 25 FPS video, 10 frames = 0.4 seconds
        # Vehicle moves 100 pixels horizontally in 0.4s
        # Scale: 0.045 meters/pixel => 4.5 meters in 0.4s => 11.25 m/s => 40.5 km/h
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
        self.assertAlmostEqual(result["estimated_speed_kmh"], 40.5, delta=1.5)
        self.assertGreater(result["max_speed_kmh"], 35.0)

    def test_insufficient_track_history(self):
        result = calculate_track_speed([], fps=25.0)
        self.assertFalse(result["valid"])
        self.assertEqual(result["estimated_speed_kmh"], 0.0)


if __name__ == "__main__":
    unittest.main()
