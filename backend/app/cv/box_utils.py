def normalize_bbox(box, width, height):
    return [box[0] / width, box[1] / height, box[2] / width, box[3] / height]
