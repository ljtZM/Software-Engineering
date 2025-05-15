# import csv
# import json
# from bs4 import BeautifulSoup
#
# # 原始 JSON 数据
# with open("D:/桌面/软件工程/f7ee1bebe4a9404083f70b4961b92c86 (1)/软件工程大作业数据/水质数据/2020-05/2020-05-08.json", "r", encoding="utf-8") as f:
#     data = json.load(f)
#
# # 获取表头，去除HTML标签
# thead = [BeautifulSoup(cell, "html.parser").get_text().replace("\n", "").replace(" ", " ").strip() for cell in data["thead"]]
#
# # 获取数据行 tbody
# tbody = []
# for row in data["tbody"]:
#     clean_row = []
#     for cell in row:
#         # 去除HTML标签，只保留可读文字
#         text = BeautifulSoup(cell, "html.parser").get_text().strip()
#         clean_row.append(text)
#     tbody.append(clean_row)
#
# # 写入CSV文件
# with open("D:/桌面/软件工程/f7ee1bebe4a9404083f70b4961b92c86 (1)/软件工程大作业数据/水质数据/2020-05/output.csv", "w", newline="", encoding="utf-8-sig") as f:
#     writer = csv.writer(f)
#     writer.writerow(thead)
#     writer.writerows(tbody)
#
# print("✅ 数据已成功写入 output.csv 文件")
#df = pd.read_csv("D:/桌面/软件工程/f7ee1bebe4a9404083f70b4961b92c86 (1)/软件工程大作业数据/水质数据/water_quality_by_name/安徽省/淮河流域/白洋淀渡口/2021-04/白洋淀渡口.csv", encoding='utf-8')



#
# import pandas as pd
# import pymysql
# import numpy as np
#
# # 读取CSV（注意这里使用 UTF-8 编码，如果打不开尝试改为 'gbk'）
# df = pd.read_csv("D:/桌面/water_quality_by_name/安徽省/巢湖流域/湖滨/2021-04/湖滨.csv", encoding='utf-8')
# # 打印前10行原始数据（检查是否有隐藏字符或格式不一致）
# print(df["监测时间"].head(10).to_list())
#
# # 假设所有数据年份为 2021
# df["监测时间"] = "2025-" + df["监测时间"].str.strip()  # 例如 "04-01 04:00" → "2021-04-01 04:00"
# df["监测时间"] = pd.to_datetime(df["监测时间"], format="%Y-%m-%d %H:%M", errors="coerce")
# # 检查转换失败的行（如果有无效时间格式会显示数量）
# print("时间转换失败的行数：", df["监测时间"].isna().sum())
#
#
# for col in ["叶绿素α(mg/L)", "藻密度(cells/L)"]:
#     df[col] = df[col].apply(lambda x: None if x == "*" else x)
#
# # 数据库连接配置
# connection = pymysql.connect(
#     host="localhost",
#     user="root",
#     password="root",  # 默认XAMPP密码为空，若设置过请修改
#     database="ocean_farm",
#     charset="utf8mb4"
# )
#
# cursor = connection.cursor()
#
# # 插入数据
# for _, row in df.iterrows():
#     sql = """
#         INSERT INTO water_quality (
#             province, basin, section_name, monitor_time,
#             water_quality_level, temperature, pH, dissolved_oxygen,
#             conductivity, turbidity, permanganate_index,
#             ammonia_nitrogen, total_phosphorus, total_nitrogen,
#             chlorophyll_a, algae_density, station_status
#         ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
#     """
#     values = (
#         row["省份"], row["流域"], row["断面名称"], row["监测时间"],
#         row["水质类别"], row["水温(℃)"], row["pH(无量纲)"], row["溶解氧(mg/L)"],
#         row["电导率(μS/cm)"], row["浊度(NTU)"], row["高锰酸盐指数(mg/L)"],
#         row["氨氮(mg/L)"], row["总磷(mg/L)"], row["总氮(mg/L)"],
#         row["叶绿素α(mg/L)"], row["藻密度(cells/L)"], row["站点情况"]
#     )
#     cursor.execute(sql, values)
#
# # 提交并关闭
# connection.commit()
# cursor.close()
# connection.close()
#
# print("数据已成功导入 MySQL 数据库！")
#


import os
import pandas as pd
import pymysql
from tqdm import tqdm  # 进度条工具，可选安装


def process_csv_files(root_dir, db_config,sql):
    """
    批量处理水质CSV文件并导入数据库
    :param root_dir: CSV文件根目录（water_quality_by_name）
    :param db_config: 数据库配置字典
    """
    # 连接数据库（全局保持一个连接）
    connection = pymysql.connect(**db_config)
    cursor = connection.cursor()

    # 遍历所有CSV文件
    csv_files = []
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(".csv"):
                csv_files.append(os.path.join(root, file))

    # 进度条（需要安装tqdm库）
    for csv_path in tqdm(csv_files, desc="处理文件中"):
        try:
            # 从路径提取年份（假设父目录为 2021-04 格式）
            parent_dir = os.path.basename(os.path.dirname(csv_path))
            # if '-' in parent_dir:
            #     year = parent_dir.split('-')[0]
            # else:
            year = "2025"  # 默认年份

            # 读取CSV
            df = pd.read_csv(csv_path, encoding='utf-8')

            # 处理监测时间（自动补全年份）
            df["监测时间"] = df["监测时间"].astype(str).str.strip()
            df["监测时间"] = year + '-' + df["监测时间"]
            df["监测时间"] = pd.to_datetime(
                df["监测时间"],
                format="%Y-%m-%d %H:%M",
                errors="coerce"
            )

            # 清理无效数据
            for col in ["叶绿素α(mg/L)", "藻密度(cells/L)"]:
                if col in df.columns:
                    df[col] = df[col].apply(lambda x: None if x == "*" else x)

            # 插入数据库
            for _, row in df.iterrows():
                # 确保所有字段存在（处理不同CSV的列差异）
                values = (
                    row.get("省份", ""),  # 如果列不存在返回空字符串
                    row.get("流域", ""),
                    row.get("断面名称", ""),
                    row["监测时间"],  # 必须存在的字段
                    row.get("水质类别", None),
                    row.get("水温(℃)", None),
                    row.get("pH(无量纲)", None),
                    row.get("溶解氧(mg/L)", None),
                    row.get("电导率(μS/cm)", None),
                    row.get("浊度(NTU)", None),
                    row.get("高锰酸盐指数(mg/L)", None),
                    row.get("氨氮(mg/L)", None),
                    row.get("总磷(mg/L)", None),
                    row.get("总氮(mg/L)", None),
                    row.get("叶绿素α(mg/L)", None),
                    row.get("藻密度(cells/L)", None),
                    row.get("站点情况", None)
                )
                cursor.execute(sql, values)

            connection.commit()  # 每个文件提交一次

        except Exception as e:
            print(f"\n处理文件失败：{csv_path}")
            print(f"错误信息：{str(e)}")
            connection.rollback()  # 回滚当前文件的事务

    # 关闭连接
    cursor.close()
    connection.close()


if __name__ == "__main__":
    # 配置参数
    DB_CONFIG = {
        "host": "localhost",
        "user": "root",
        "password": "root",
        "database": "ocean_farm",
        "charset": "utf8mb4"
    }

    SQL = """
    INSERT INTO water_quality (
        province, basin, section_name, monitor_time,
        water_quality_level, temperature, pH, dissolved_oxygen,
        conductivity, turbidity, permanganate_index,
        ammonia_nitrogen, total_phosphorus, total_nitrogen,
        chlorophyll_a, algae_density, station_status
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    # 指定根目录（根据实际情况修改）
    ROOT_DIR = "D:/桌面/1"

    # 执行批量导入
    process_csv_files(ROOT_DIR, DB_CONFIG,SQL)
    print("所有数据已批量导入完成！")