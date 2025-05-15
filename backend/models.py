# models.py
from app import db


class WaterQuality(db.Model):
    __tablename__ = 'water_quality'

    id = db.Column(db.Integer, primary_key=True)
    province = db.Column(db.String(50))
    basin = db.Column(db.String(50))
    section_name = db.Column(db.String(100))
    monitor_time = db.Column(db.DateTime)

    # 其他字段根据你的表结构补充完整...

    def to_dict(self):
        return {
            'province': self.province,
            'basin': self.basin,
            'section_name': self.section_name,
            'monitor_time': self.monitor_time.isoformat(),
            'temperature': self.temperature,
            'ph': self.ph,
            # 补充其他需要返回的字段...
        }