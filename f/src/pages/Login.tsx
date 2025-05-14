// import { useState } from 'react';
// import axios from 'axios';

// export default function Login() {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');

//   const handleLogin = async () => {
//     const res = await axios.post('http://localhost:5000/api/login', {
//       username,
//       password
//     });
//     alert('登录成功，token: ' + res.data.access_token);
//   };

//   return (
//     <div>
//       <h2>登录</h2>
//       <input placeholder="用户名" value={username} onChange={e => setUsername(e.target.value)} />
//       <input placeholder="密码" type="password" value={password} onChange={e => setPassword(e.target.value)} />
//       <button onClick={handleLogin}>登录</button>
//     </div>
//   );
// }


import { useEffect, useState } from 'react';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import Select, { SingleValue } from 'react-select';
import { MapPinIcon } from '@heroicons/react/24/solid'; // Heroicons v2（React 24/solid）
// 在文件顶部添加以下导入语句
import { GlobeAltIcon,ChartBarIcon } from '@heroicons/react/24/outline';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './Login.css';
import {
  ClockIcon,
  ArrowPathIcon,
  CpuChipIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Location {
  province: string;
  basin: string;
  section_name: string;
}

interface LatestData {
  monitor_time: string; // 格式化为 ISO 字符串
  water_quality_level: string;
  temperature: number;
  pH: number;
  dissolved_oxygen: number;
  conductivity: number;
  turbidity: number;
  permanganate_index: number;
  ammonia_nitrogen: number;
  total_phosphorus: number;
  total_nitrogen: number;
  chlorophyll_a: string;
  algae_density: string;
  station_status: string;
}

interface RangeData {
  monitor_time: string;
  water_quality_level: string;
  temperature: number;
  pH: number;
  dissolved_oxygen: number;
  conductivity: number;
  turbidity: number;
}

interface Device {
  device_id: string;
  device_type: string;
  device_version: string;
  device_status: string;
  install_location: string;
}

export default function LocationSelector() {
  const [monitorPlaying, setMonitorPlaying] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<'v1' | 'v2'>('v1');
  const [locations, setLocations] = useState<Location[]>([]);
  const [province, setProvince] = useState('');
  const [basin, setBasin] = useState('');
  const [section, setSection] = useState('');
  const [latestData, setLatestData] = useState<LatestData | null>(null);
  const [rangeData, setRangeData] = useState<RangeData[]>([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedValue, setSelectedValue] = useState('dissolved_oxygen'); // 默认选项是溶解氧
  const [devices, setDevices] = useState<Device[]>([]);  // 设备信息
  const [time, setTime] = useState(getFormattedTime());
  const [currentTime, setCurrentTime] = useState('');

  // 更新时间
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleString();
      setCurrentTime(formatted);
    };
    updateTime(); // 初始调用
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    axios.get('http://localhost:5000/api/locations')
      .then(res => {
        setLocations(res.data.data);
      })
      .catch(err => {
        console.error('加载监测点失败', err);
      });
  }, []);

  // 选完断面后，请求最新数据和设备信息
  useEffect(() => {
    if (section) {
      // 请求最新数据
      axios.get('http://localhost:5000/api/latest-data', {
        params: { section_name: section }
      }).then(res => {
        if (res.data.code === 200 || res.data.data) {
          setLatestData(res.data.data);
        } else {
          setLatestData(null);
          alert('没有找到该断面的数据');
        }
      }).catch(err => {
        console.error('获取最新数据失败:', err);
        alert('网络错误，无法获取最新数据');
      });

      // 请求该断面下的所有设备信息
      axios.get('http://localhost:5000/api/device-info', {
        params: { install_location: section }
      }).then(res => {
        if (res.data.code === 200 && res.data.data) {
          setDevices(res.data.data);
        } else {
          setDevices([]);  // 没有设备时清空
          alert('没有找到该位置的设备');
        }
      }).catch(err => {
        console.error('获取设备信息失败:', err);
        alert('网络错误，无法获取设备信息');
      });
    } else {
      setLatestData(null);  // 清空数据
      setDevices([]);  // 清空设备列表
    }
  }, [section]);

  // 根据选择的时间范围请求数据
  const fetchRangeData = () => {
    if (section && startTime && endTime) {
      axios.get('http://localhost:5000/api/range-data', {
        params: {
          section_name: section,
          start_time: startTime,
          end_time: endTime
        }
      }).then(res => {
        if (res.data.code === 200 && res.data.data) {
          setRangeData(res.data.data);
        } else {
          setRangeData([]);
          alert('没有找到该时间范围的数据');
        }
      }).catch(err => {
        console.error('获取时间范围数据失败:', err);
        alert('网络错误，无法获取数据');
      });
    }
  };

  const provinces = Array.from(new Set(locations.map(l => l.province)));
  const basins = Array.from(new Set(locations.filter(l => l.province === province).map(l => l.basin)));
  const sections = locations.filter(l => l.province === province && l.basin === basin);

  // 图表数据准备
  const chartData = {
    labels: rangeData.map(r => r.monitor_time),
    datasets: [
      {
        label: selectedValue === 'dissolved_oxygen' ? '溶解氧 (mg/L)' : selectedValue === 'conductivity' ? '电导率 (μS/cm)' : 'pH值',
        data: rangeData.map(r => r[selectedValue as keyof RangeData]),
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1
      }
    ]
  };

  const getVideoSrc = () => {
    return selectedVideo === 'v1' ? '/v1.mp4' : '/v2.mp4';
  };

  function getFormattedTime(): string {
    const date = new Date();
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const Y = date.getFullYear();
    const M = date.getMonth() + 1;
    const D = date.getDate();
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    const week = weekDays[date.getDay()];
    return `${Y}年${M}月${D}日 ${week} ${h}:${m}:${s}`;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getFormattedTime());
    }, 1000);
    return () => clearInterval(timer); // 清理定时器
  }, []);

  type OptionType = { value: string; label: string };
//   return (
//     <div style={{ backgroundColor: '#e0f7fa', minHeight: '100vh', padding: '20px' }}>
//     <h1 style={{ textAlign: 'center', color: '#0277bd' }}>海洋牧场监控系统</h1>
//       <h2>选择监测断面</h2>

//       {/* 省份选择 */}
//       <select value={province} onChange={e => {
//         setProvince(e.target.value);
//         setBasin('');
//         setSection('');
//       }}>
//         <option value="">请选择省份</option>
//         {provinces.map(p => <option key={p} value={p}>{p}</option>)}
//       </select>

//       {/* 流域选择 */}
//       <select value={basin} onChange={e => {
//         setBasin(e.target.value);
//         setSection('');
//       }} disabled={!province}>
//         <option value="">请选择流域</option>
//         {basins.map(b => <option key={b} value={b}>{b}</option>)}
//       </select>

//       {/* 断面选择 */}
//       <select value={section} onChange={e => setSection(e.target.value)} disabled={!basin}>
//         <option value="">请选择断面</option>
//         {sections.map(s => (
//           <option key={s.section_name} value={s.section_name}>
//             {s.section_name}
//           </option>
//         ))}
//       </select>

//       {/* 选择时间范围 */}
//       <div>
//         <input 
//           type="datetime-local" 
//           value={startTime} 
//           onChange={e => setStartTime(e.target.value)} 
//         />
//         <input 
//           type="datetime-local" 
//           value={endTime} 
//           onChange={e => setEndTime(e.target.value)} 
//         />
//         <button onClick={fetchRangeData}>获取数据</button>
//       </div>

//       {/* 选择监测指标 */}
//       <select value={selectedValue} onChange={e => setSelectedValue(e.target.value)}>
//         <option value="dissolved_oxygen">溶解氧</option>
//         <option value="conductivity">电导率</option>
//         <option value="pH">pH值</option>
//       </select>

//       {/* 展示最新数据 */}
//       {latestData && (
//         <div style={{ marginTop: '20px' }}>
//           <h3>最新监测数据</h3>
//           <p>水质等级: {latestData.water_quality_level}</p>
//           <p>温度: {latestData.temperature}°C</p>
//           <p>pH值: {latestData.pH}</p>
//           <p>溶解氧: {latestData.dissolved_oxygen} mg/L</p>
//           <p>电导率: {latestData.conductivity} μS/cm</p>
//           <p>浑浊度: {latestData.turbidity} NTU</p>
//         </div>
//       )}

//       {/* 展示设备信息 */}
//       {devices.length > 0 && (
//         <div style={{ marginTop: '20px' }}>
//           <h3>设备信息</h3>
//           <ul>
//           {devices.map(device => (
//         <li key={device.device_id}>
//           <strong>{device.device_type}</strong> ({device.device_version}) - 状态: {device.device_status}
//         </li>
//       ))}
//           </ul>
//         </div>
//       )}

//       {/* 图表展示 */}
//       <div style={{ marginTop: '20px' }}>
//         <h3>{selectedValue === 'dissolved_oxygen' ? '溶解氧' : selectedValue === 'conductivity' ? '电导率' : 'pH值'} 曲线图</h3>
//         <Line data={chartData} />
//       </div>


//       <div style={{ marginTop: '20px' }}>
//   <button onClick={() => setMonitorPlaying(prev => !prev)}>
//     {monitorPlaying ? '关闭监控' : '开启监控'}
//   </button>
// </div>


// <button
//         onClick={() => setSelectedVideo('v1')}
//         disabled={!monitorPlaying}
//         style={{
//           marginRight: '5px',
//           backgroundColor: selectedVideo === 'v1' ? '#4caf50' : '#e0e0e0'
//         }}
//       >
//         视频1（角度一）
//       </button>
//       <button
//         onClick={() => setSelectedVideo('v2')}
//         disabled={!monitorPlaying}
//         style={{
//           backgroundColor: selectedVideo === 'v2' ? '#4caf50' : '#e0e0e0'
//         }}
//       >
//         视频2（角度二）
//       </button>

//       {/* 播放区域 */}
//       <div style={{ marginTop: '20px' }}>
//         {monitorPlaying ? (
//           <video key={selectedVideo} width="640" height="360" controls autoPlay>
//           <source src={getVideoSrc()} type="video/mp4" />
//           您的浏览器不支持 HTML5 视频播放。
//         </video>
//         ) : (
//           <div style={{ padding: '20px', border: '1px solid #ccc' }}>
//             监控视频关闭！请打开！
//           </div>
//         )}
//       </div>

//     </div>
//   );


return (
  <div style={{ backgroundColor: '#e0f7fa', minHeight: '100vh', padding: '20px' }}>
    {/* 三列布局 */}
    <div style={{ display: 'flex', gap: '20px' }}>
      {/* 左侧：视频监控区域 */}
<div style={{ 
  flex: 1, 
  backgroundColor: '#0a1a2f',
  padding: '24px',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
}}>
  {/* 监控控制栏 */}
  <div style={{ 
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  }}>
    <h2 style={{ 
      color: '#64ffda',
      fontSize: '1.5rem',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64ffda">
        <path d="M2 12h3l2-8 2 18 2-8h3"/>
      </svg>
      视频监控
    </h2>
    
    <button 
      onClick={() => setMonitorPlaying(prev => !prev)}
      style={{
        background: monitorPlaying ? '#ff1744' : '#00e676',
        color: 'white',
        padding: '8px 20px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s'
      }}
    >
      {monitorPlaying ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="1"/>
          </svg>
          关闭监控
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 12h14M12 5v14"/>
          </svg>
          开启监控
        </>
      )}
    </button>
  </div>

  {/* 视频选择按钮 */}
<div style={{ 
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '12px',
  marginBottom: '24px'
}}>
  {(['v1', 'v2'] as const).map((videoId) => (
    <button
      key={videoId}
      onClick={() => setSelectedVideo(videoId)}
      disabled={!monitorPlaying}
      style={{
        background: selectedVideo === videoId ? 'rgba(100,255,218,0.2)' : 'transparent',
        border: '2px solid ' + (selectedVideo === videoId ? '#64ffda' : '#2a3a5a'),
        color: selectedVideo === videoId ? '#64ffda' : '#7f8ca3',
        padding: '12px',
        borderRadius: '8px',
        cursor: monitorPlaying ? 'pointer' : 'not-allowed',
        transition: 'all 0.3s',
        opacity: monitorPlaying ? 1 : 0.6
      }}
    >
      视频{videoId.slice(1)}（角度{videoId.slice(1)}）
    </button>
  ))}
</div>

  {/* 视频展示区域 */}
  <div style={{
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: '8px',
    overflow: 'hidden',
    minHeight: '400px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}>
    {monitorPlaying ? (
      <video 
        key={selectedVideo}
        style={{ width: '100%', height: 'auto' }}
        controls 
        autoPlay
      >
        <source src={getVideoSrc()} type="video/mp4" />
      </video>
    ) : (
      <div style={{
        color: '#64748b',
        fontSize: '1.2rem',
        textAlign: 'center',
        padding: '40px'
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#64748b" style={{ marginBottom: '16px' }}>
          <path d="M15 12h-2v2h2v-2zm0-6h-2v4h2V6z"/>
          <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-2H5v-7c0-3.87 3.13-7 7-7s7 3.13 7 7v7h-4v2h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z"/>
        </svg>
        <p>请打开监控播放查看实时画面</p>
      </div>
    )}
  </div>

  {/* 附加功能按钮组 */}
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginTop: '24px'
  }}>
    {['摄像机', '灯光', '清洁刷', '视频回放', '分屏查看', '云台控制'].map((label) => (
      <button
        key={label}
        onClick={() => label === '摄像机' ? null : alert('功能尚在开发中')}
        style={{
          background: '#1a2539',
          border: 'none',
          color: label === '摄像机' ? '#64ffda' : '#64748b',
          padding: '12px',
          borderRadius: '8px',
          cursor: label === '摄像机' ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.3s'
        }}
      >
        {label}
        {label !== '摄像机' && <span style={{ fontSize: '0.8em', color: '#94a3b8' }}>(开发中)</span>}
      </button>
    ))}
  </div>
</div>


      {/* 中间：断面选择与最新数据
      <div style={{ flex: 1 }}>
        <h2>选择监测断面</h2>
        <select value={province} onChange={e => {
          setProvince(e.target.value);
          setBasin('');
          setSection('');
        }}>
          <option value="">请选择省份</option>
          {provinces.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select value={basin} onChange={e => {
          setBasin(e.target.value);
          setSection('');
        }} disabled={!province}>
          <option value="">请选择流域</option>
          {basins.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <select value={section} onChange={e => setSection(e.target.value)} disabled={!basin}>
          <option value="">请选择断面</option>
          {sections.map(s => (
            <option key={s.section_name} value={s.section_name}>
              {s.section_name}
            </option>
          ))}
        </select>

        {latestData && (
          <div style={{ marginTop: '20px' }}>
            <h3>最新监测数据</h3>
            <p>水质等级: {latestData.water_quality_level}</p>
            <p>温度: {latestData.temperature}°C</p>
            <p>pH值: {latestData.pH}</p>
            <p>溶解氧: {latestData.dissolved_oxygen} mg/L</p>
            <p>电导率: {latestData.conductivity} μS/cm</p>
            <p>浑浊度: {latestData.turbidity} NTU</p>
          </div>
        )}
      </div> */}
      {/* 中间：监测数据与地图 */}
      <div style={{ 
        flex: 1,
        maxWidth: '33.33%',
        backgroundColor: '#0a1a2f',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        margin: '0 12px'
      }}>
  {/* 级联选择器 */}
  <div style={{ color: '#64ffda' }}>
          <h2 style={{ 
            fontSize: '1.5rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
          <MapPinIcon style={{ width: '40px', height: '40px' }} className="text-blue-50" /> {/* 调整图标大小 */}
      监测断面选择
    </h2>
    
    <Select
    styles={{
      control: (base) => ({
        ...base,
        backgroundColor: '#1a2539',
        borderColor: '#2a3a5a',
        color: '#64ffda'
      }),
      singleValue: (base) => ({
        ...base,
        color: '#64ffda'
      })
    }}
      value={province ? { value: province, label: province } : null}
      onChange={(selectedOption: SingleValue<OptionType>) => {
        setProvince(selectedOption?.value || '');
        setBasin('');
        setSection('');
      }}
      options={provinces.map(p => ({ value: p, label: p }))}
      placeholder="选择省份"
      className="react-select-container"
      classNamePrefix="react-select"
    />

    <Select
    styles={{
      control: (base) => ({
        ...base,
        backgroundColor: '#1a2539',
        borderColor: '#2a3a5a',
        color: '#64ffda'
      }),
      singleValue: (base) => ({
        ...base,
        color: '#64ffda'
      })
    }}
      value={basin ? { value: basin, label: basin } : null}
      onChange={(selected: SingleValue<{ value: string; label: string }>) => {
        setBasin(selected?.value || '');
        setSection('');
      }}
      options={basins.map(b => ({ value: b, label: b }))}
      placeholder="选择流域"
      isDisabled={!province}
      className="react-select-container"
      classNamePrefix="react-select"
    />

    <Select
    styles={{
      control: (base) => ({
        ...base,
        backgroundColor: '#1a2539',
        borderColor: '#2a3a5a',
        color: '#64ffda'
      }),
      singleValue: (base) => ({
        ...base,
        color: '#64ffda'
      })
    }}
      value={section ? { value: section, label: section } : null}
      onChange={(selected: SingleValue<{ value: string; label: string }>) => {
        setSection(selected?.value || '');
      }}
      options={sections.map(s => ({
        value: s.section_name,
        label: s.section_name
      }))}
      placeholder="选择监测断面"
      isDisabled={!basin}
      className="react-select-container"
      classNamePrefix="react-select"
    />
  </div>

  {/* 水文数据展示 */}
  <div style={{ 
          backgroundColor: '#1a2539',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px',
          color: '#64ffda'
        }}>
          <h3 style={{ 
            fontSize: '1.2rem',
            marginBottom: '16px'
          }}>      
          <ChartBarIcon style={{ width: '40px', height: '40px' }} className="text-blue-50" /> {/* 调整图标大小 */}
      实时水文数据
    </h3>
    
    <div className="grid grid-cols-2 gap-3"> {/* 缩小间距 */}
      {[
        { label: '溶解氧', value: latestData?.dissolved_oxygen || 0, unit: 'mg/L' },
        { label: '浊度', value: latestData?.turbidity || 0, unit: 'NTU' },
        { label: 'pH值', value: latestData?.pH || 0 },
        { label: '水温', value: latestData?.temperature || 0, unit: '°C' }
      ].map((item, index) => (
        <div key={index} style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: '1px solid #2a3a5a'
        }}>
          <span style={{ color: '#7f8ca3' }}>{item.label}</span>
          <span style={{ color: '#64ffda' }}>{item.value}</span>
        </div>
      ))}
    </div>
  </div>

  {/* 地图展示 */}
  {section && (
    <div style={{ 
      backgroundColor: '#1a2539',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '24px',
      color: '#64ffda'
    }}>
      <h3 style={{ 
        fontSize: '1.2rem',
        marginBottom: '16px'
      }}>       
      <GlobeAltIcon style={{ width: '40px', height: '40px' }}className="w-5 h-5 text-emerald-500" /> {/* 调整图标大小 */}
        监测点位置
      </h3>
      
      <div className="h-48 bg-slate-100 rounded-lg overflow-hidden"> {/* 减小高度 */}
        <MapContainer 
          center={[35.12, 120.45]} 
          zoom={10} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker position={[35.12, 120.45]}>
            <Popup>{section}监测点</Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  )}
</div>


{/* 右侧：数据分析面板 */}
<div style={{ 
        flex: 1,
        backgroundColor: '#0a1a2f',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        marginLeft: '24px'
      }}>
  {/* 时间选择器 */}
  {/* 时间选择器 */}
  <div style={{ color: '#64ffda' }}>
          <h2 style={{ 
            fontSize: '1.5rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
          <ClockIcon style={{ width: '35px', height: '35px' }}className="w-5 h-5 text-purple-500" />
      数据分析
    </h2>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm text-slate-600">开始时间</label>
        <input
            type="datetime-local"
            style={{
              backgroundColor: '#1a2539',
              border: '1px solid #2a3a5a',
              color: '#64ffda',
              borderRadius: '8px',
              padding: '8px'
            }}
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-slate-600">结束时间</label>
        <input
            type="datetime-local"
            style={{
              backgroundColor: '#1a2539',
              border: '1px solid #2a3a5a',
              color: '#64ffda',
              borderRadius: '8px',
              padding: '8px'
            }}
          value={endTime}
          onChange={e => setEndTime(e.target.value)}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    <button onClick={fetchRangeData} className="query-button">
  <ArrowPathIcon style={{ width: '18px', height: '18px', color: '#64ffda' }} />
  查询数据
</button>
  </div>

  {/* 监测指标选择 */}
  <div style={{ 
          backgroundColor: '#1a2539',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px',
          color: '#64ffda'
        }}>
          <h3 style={{ 
            fontSize: '1.2rem',
            marginBottom: '16px'
          }}>分析指标</h3>
    {/* 指标选择器 */}
<select 
  value={selectedValue} 
  onChange={e => setSelectedValue(e.target.value)}
  style={{
    width: '100%',
    backgroundColor: '#1a2539',
    border: '1px solid #2a3a5a',
    color: '#64ffda',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364ffda'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '14px'
  }}
>
  <option 
    value="dissolved_oxygen" 
    style={{ backgroundColor: '#0a1a2f' }}
  >
    溶解氧 (mg/L)
  </option>
  <option 
    value="conductivity"
    style={{ backgroundColor: '#0a1a2f' }}
  >
    电导率 (μS/cm)
  </option>
  <option 
    value="pH"
    style={{ backgroundColor: '#0a1a2f' }}
  >
    pH值
  </option>
</select>
  </div>

  {/* 数据图表 */}
  <div style={{ 
          backgroundColor: '#1a2539',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px',
          color: '#64ffda'
        }}>
          <h3 style={{ 
            fontSize: '1.2rem',
            marginBottom: '16px'
          }}>      
        <ChartBarIcon style={{ width: '35px', height: '35px' }}className="w-5 h-5 text-rose-500" />
      {{
        'dissolved_oxygen': '溶解氧浓度趋势',
        'conductivity': '电导率变化趋势',
        'pH': 'pH值变化曲线'
      }[selectedValue]}
    </h3>
    
    <div style={{ 
          backgroundColor: '#1a2539',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px'
        }}>
        <Line 
            data={chartData}
            options={{
              plugins: {
                legend: {
                  labels: {
                    color: '#64ffda'
                  }
                }
              },
              scales: {
                y: {
                  grid: { color: '#2a3a5a' },
                  ticks: { color: '#7f8ca3' }
                },
                x: {
                  grid: { color: '#2a3a5a' },
                  ticks: { color: '#7f8ca3' }
                }
              }
            }}
          />
    </div>
  </div>
  {/* 设备信息 */}
  <div style={{ 
          backgroundColor: '#1a2539',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px',
          color: '#64ffda'
        }}>
          <h3 style={{ 
            fontSize: '1.2rem',
            marginBottom: '16px'
          }}>设备信息</h3>
  {devices.length > 0 ? (
    <ul>
      {devices.map(device => (
        <li key={device.device_id}>
          <strong>{device.device_type}</strong>（{device.device_version}） - 状态: {device.device_status}
        </li>
      ))}
    </ul>
  ) : (
    <p>暂无设备信息</p>
  )}
</div>
</div>

    </div> 

    </div>

);



}

