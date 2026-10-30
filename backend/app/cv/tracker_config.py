from dataclasses import dataclass

@dataclass
class ByteTrackConfig:
    track_thresh: float = 0.5
    track_buffer: int = 30
    match_thresh: float = 0.8
