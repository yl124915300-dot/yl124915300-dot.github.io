# Third-party Vision Assets
- MediaPipe Tasks Vision @0.10.35 runtime, Apache-2.0, https://github.com/google-ai-edge/mediapipe
- Google's official EfficientDet-Lite0 int8 COCO object detector, https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite
- Object classes (cat, dog, person, etc.) indicate bounding-box candidates only. The model does not understand emotions, vocalization sources, body language or cat-language semantics.
- Vision inference occurs locally in an authorized browser. MediaPipe may process non-media performance metrics; see https://developers.google.com/edge/mediapipe/solutions/tasks
- Source sample image (used only transiently in CI, not distributed) is Google's MediaPipe example from Pixabay, https://storage.googleapis.com/mediapipe-tasks/object_detector/cat_and_dog.jpg
