from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask import Response
import json
from sqlalchemy import func  # ← 必须加上！
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config.from_pyfile('config.py')
db = SQLAlchemy(app)

class WaterQuality(db.Model):
    __tablename__ = 'water_quality'

    id = db.Column(db.Integer, primary_key=True)
    province = db.Column(db.String(50))
    basin = db.Column(db.String(100))
    section_name = db.Column(db.String(100))
    monitor_time = db.Column(db.DateTime)
    water_quality_level = db.Column(db.String())
    temperature = db.Column(db.Float)
    pH = db.Column(db.Float)
    dissolved_oxygen = db.Column(db.Float)
    conductivity = db.Column(db.Integer)
    turbidity = db.Column(db.Float)
    permanganate_index = db.Column(db.Float)
    ammonia_nitrogen = db.Column(db.Float)
    total_phosphorus = db.Column(db.Float)
    total_nitrogen = db.Column(db.Float)
    chlorophyll_a = db.Column(db.String(20))
    algae_density = db.Column(db.String(20))
    station_status = db.Column(db.String())

    def to_dict(self):
        return {
            'monitor_time': self.monitor_time.isoformat() if self.monitor_time else None,
            'water_quality_level': self.water_quality_level,
            'temperature': self.temperature,
            'pH': self.pH,
            'dissolved_oxygen': self.dissolved_oxygen,
            'conductivity': self.conductivity,
            'turbidity': self.turbidity,
            'permanganate_index': self.permanganate_index,
            'ammonia_nitrogen': self.ammonia_nitrogen,
            'total_phosphorus': self.total_phosphorus,
            'total_nitrogen': self.total_nitrogen,
            'chlorophyll_a': self.chlorophyll_a,
            'algae_density': self.algae_density,
            'station_status': self.station_status
        }


class MarineFarmDevice(db.Model):
    __tablename__ = 'marine_farm_device'

    id = db.Column(db.Integer, primary_key=True)
    device_code = db.Column(db.String(50), unique=True, nullable=False)
    device_type = db.Column(db.String(100), nullable=False)
    device_version = db.Column(db.String(50), nullable=False)
    device_status = db.Column(db.String(50), nullable=False)
    install_location = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'device_code': self.device_code,  # 修改为 device_code
            'device_type': self.device_type,
            'device_version': self.device_version,
            'device_status': self.device_status,
            'install_location': self.install_location
        }

# 获取所有监测点位置信息，去重
@app.route('/api/locations', methods=['GET'])
def get_locations():
    try:
        locations = db.session.query(
            WaterQuality.section_name,
            WaterQuality.province,
            WaterQuality.basin
        ).all()

        seen = set()
        locations_list = []

        for loc in locations:
            # 先清洗字段内容（去掉空格和可能的大小写差异）
            section = loc.section_name.strip()
            province = loc.province.strip()
            basin = loc.basin.strip()

            # 用标准化后的内容去重
            key = (section, province, basin)
            if key not in seen:
                seen.add(key)
                locations_list.append({
                    "section_name": section,
                    "province": province,
                    "basin": basin
                })

        # 返回中文正常显示
        return Response(
            json.dumps({"code": 200, "data": locations_list}, ensure_ascii=False),
            content_type='application/json; charset=utf-8'
        )

    except Exception as e:
        return jsonify({"code": 500, "message": str(e)})


# 获取指
@app.route('/api/latest-data', methods=['GET'])
def get_latest_data():
    try:
        section_name = request.args.get('section_name')
        if not section_name:
            return jsonify({"code": 400, "message": "需要提供section_name参数"})

        section_name = section_name.strip()
        print(f"Debug - 正在查询: '{section_name}'")

        # 修改为精确匹配（假设数据库中的 section_name 无多余空格）
        # latest_data = WaterQuality.query.filter_by(
        #     section_name=section_name
        # ).order_by(
        #     WaterQuality.monitor_time.desc()
        # ).first()

        # 如果仍然失败，尝试模糊匹配
        latest_data = WaterQuality.query.filter(
            WaterQuality.section_name.ilike(f"%{section_name}%")
        ).order_by(
            WaterQuality.monitor_time.desc()
        ).first()

        if not latest_data:
            print(f"Debug - 未找到数据: '{section_name}'")
            return jsonify({"code": 404, "message": "未找到相关数据"})

        print(f"Debug - 最新数据: {latest_data.to_dict()}")
        return Response(
            json.dumps({"code": 200, "data": latest_data.to_dict()}, ensure_ascii=False),
            content_type='application/json; charset=utf-8'
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"code": 500, "message": "服务器内部错误"})




@app.route('/api/range-data', methods=['GET'])
def get_range_data():
    try:
        section_name = request.args.get('section_name')
        start_time_str = request.args.get('start_time')
        end_time_str = request.args.get('end_time')

        if not section_name or not start_time_str or not end_time_str:
            return jsonify({"code": 400, "message": "需要提供 section_name、start_time 和 end_time 参数"})

        section_name = section_name.strip()

        # 解析时间字符串
        try:
            start_time = datetime.fromisoformat(start_time_str)
            end_time = datetime.fromisoformat(end_time_str)
        except ValueError:
            return jsonify({"code": 400, "message": "时间格式错误，需为 YYYY-MM-DDTHH:MM:SS"})

        # 查询符合条件的数据（模糊匹配 + 时间范围）
        records = WaterQuality.query.filter(
            WaterQuality.section_name.ilike(f"%{section_name}%"),
            WaterQuality.monitor_time >= start_time,
            WaterQuality.monitor_time <= end_time
        ).order_by(WaterQuality.monitor_time.asc()).all()

        if not records:
            return jsonify({"code": 404, "message": "未找到该时间段内的数据"})

        result = [record.to_dict() for record in records]

        return Response(
            json.dumps({"code": 200, "data": result}, ensure_ascii=False),
            content_type='application/json; charset=utf-8'
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"code": 500, "message": "服务器内部错误"})


@app.route('/api/device-info', methods=['GET'])
def get_device_info():
    install_location = request.args.get('install_location')

    if not install_location:
        return jsonify({"code": 400, "message": "需要提供 install_location 参数"})

    install_location = install_location.strip()
    print(f"Debug - 正在查询安装位置: '{install_location}'")

    try:
        # 使用 filter() 而不是 filter_by()，这样可以进一步处理复杂的查询逻辑
        devices = MarineFarmDevice.query.filter(MarineFarmDevice.install_location == install_location).all()

        if not devices:
            return jsonify({"code": 404, "message": "未找到相关设备"})

        devices_list = [device.to_dict() for device in devices]

        return Response(
            json.dumps({"code": 200, "data": devices_list}, ensure_ascii=False),
            content_type='application/json; charset=utf-8'
        )
    except Exception as e:
        print(e)  # 输出异常信息
        return jsonify({"code": 500, "message": "服务器内部错误"})


@app.route('/')
def index():
    return 'Flask + XAMPP MySQL 连接成功！'


if __name__ == '__main__':
    app.run(debug=True, use_reloader=False)  # 禁用自动重载，这样更容易调试
