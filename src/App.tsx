import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Info, 
  Settings2, 
  Play, 
  Pause, 
  RotateCcw, 
  TrendingUp
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ViscoelasticScene } from './components/ViscoelasticScene';

// --- Constants & Types ---

type ModelMode = 'molecular' | 'mechanical';
type MechModel = 'maxwell' | 'kelvin' | 'sls_maxwell' | 'sls_kelvin' | 'generalized_maxwell';
type TestMode = 'creep' | 'relaxation';

interface DataPoint {
  time: number;
  stress: number;
  strain: number;
  elasticStrain: number;
  viscousStrain: number;
}

export default function App() {
  // State
  const [mode, setMode] = useState<ModelMode>('mechanical');
  const [mechModel, setMechModel] = useState<MechModel>('sls_maxwell');
  const [testMode, setTestMode] = useState<TestMode>('creep');
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [appliedStress, setAppliedStress] = useState(0);
  const [appliedStrain, setAppliedStrain] = useState(0);
  const [data, setData] = useState<DataPoint[]>([]);
  
  // Physical Parameters
  const [modulus, setModulus] = useState(1.0); // E1 or E0
  const [modulus2, setModulus2] = useState(1.0); // E2 or E1
  const [modulus3, setModulus3] = useState(1.0); // E2 for Generalized
  const [viscosity, setViscosity] = useState(2.0); // η or η1
  const [viscosity2, setViscosity2] = useState(5.0); // η2

  // Derived Physical States
  const [currentStrain, setCurrentStrain] = useState(0);
  const [currentStress, setCurrentStress] = useState(0);
  const [currentElasticStrain, setCurrentElasticStrain] = useState(0);
  const [currentViscousStrain, setCurrentViscousStrain] = useState(0);
  const [currentViscousStrain2, setCurrentViscousStrain2] = useState(0);

  // Use refs to keep track of values for the interval without re-running it
  const stateRef = useRef({
    time,
    currentStrain,
    currentStress,
    currentElasticStrain,
    currentViscousStrain,
    currentViscousStrain2
  });

  // Sync refs with state
  useEffect(() => {
    stateRef.current = {
      time,
      currentStrain,
      currentStress,
      currentElasticStrain,
      currentViscousStrain,
      currentViscousStrain2
    };
  }, [time, currentStrain, currentStress, currentElasticStrain, currentViscousStrain, currentViscousStrain2]);

  // Simulation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        const dt = 0.1;
        const s = stateRef.current;
        const nextTime = s.time + dt;
        
        let newStrain = s.currentStrain;
        let newStress = s.currentStress;
        let newElasticStrain = s.currentElasticStrain;
        let newViscousStrain = s.currentViscousStrain;
        let newViscousStrain2 = s.currentViscousStrain2;

        // Safety check: ensure all inputs are finite numbers
        const safe = (val: number, fallback = 0) => Number.isFinite(val) ? val : fallback;
        
        const E1_safe = safe(modulus, 1.0);
        const E2_safe = safe(modulus2, 1.0);
        const E3_safe = safe(modulus3, 1.0);
        const eta1_safe = safe(viscosity, 2.0);
        const eta2_safe = safe(viscosity2, 5.0);
        const sigma0_safe = safe(appliedStress, 0);
        const epsilon0_safe = safe(appliedStrain, 0);

        if (testMode === 'creep') {
          newStress = sigma0_safe;
          if (s.time === 0) {
            if (mechModel === 'maxwell') {
              newStrain = sigma0_safe / E1_safe;
              newElasticStrain = newStrain;
              newViscousStrain = 0;
            } else if (mechModel === 'kelvin') {
              newStrain = 0;
              newElasticStrain = 0;
              newViscousStrain = 0;
            } else if (mechModel === 'sls_maxwell') {
              newStrain = sigma0_safe / E1_safe;
              newElasticStrain = newStrain;
              newViscousStrain = 0;
            } else if (mechModel === 'sls_kelvin') {
              newStrain = sigma0_safe / E1_safe;
              newElasticStrain = newStrain;
              newViscousStrain = 0;
            } else if (mechModel === 'generalized_maxwell') {
              newStrain = sigma0_safe / (E1_safe + E2_safe + E3_safe);
              newElasticStrain = newStrain;
              newViscousStrain = 0;
              newViscousStrain2 = 0;
            }
          } else {
            if (mechModel === 'maxwell') {
              newElasticStrain = sigma0_safe / E1_safe;
              newViscousStrain = s.currentViscousStrain + (sigma0_safe / eta1_safe) * dt;
              newStrain = newElasticStrain + newViscousStrain;
            } else if (mechModel === 'kelvin') {
              newStrain = (sigma0_safe / E1_safe) * (1 - Math.exp(-E1_safe * nextTime / eta1_safe));
              newElasticStrain = newStrain;
              newViscousStrain = newStrain;
            } else if (mechModel === 'sls_maxwell') {
              newStrain = (sigma0_safe / E1_safe) + (sigma0_safe / E2_safe) * (1 - Math.exp(-E2_safe * nextTime / eta1_safe));
              newElasticStrain = sigma0_safe / E1_safe;
              newViscousStrain = newStrain - newElasticStrain;
            } else if (mechModel === 'sls_kelvin') {
              newElasticStrain = sigma0_safe / E1_safe;
              newViscousStrain = (sigma0_safe / E2_safe) * (1 - Math.exp(-E2_safe * nextTime / eta1_safe));
              newStrain = newElasticStrain + newViscousStrain;
            } else if (mechModel === 'generalized_maxwell') {
              const sigma1 = E2_safe * (s.currentStrain - s.currentViscousStrain);
              const sigma2 = E3_safe * (s.currentStrain - s.currentViscousStrain2);
              
              const dStrain = ( (E2_safe / eta1_safe) * sigma1 + (E3_safe / eta2_safe) * sigma2 ) / (E1_safe + E2_safe + E3_safe);
              newStrain = s.currentStrain + dStrain * dt;
              
              newViscousStrain = s.currentViscousStrain + (sigma1 / eta1_safe) * dt;
              newViscousStrain2 = s.currentViscousStrain2 + (sigma2 / eta2_safe) * dt;
              newElasticStrain = newStrain;
            }
          }
        } else {
          // Relaxation Mode
          newStrain = epsilon0_safe;
          if (s.time === 0) {
             if (mechModel === 'generalized_maxwell') {
               newViscousStrain2 = 0;
               newViscousStrain = 0;
             }
          }
          if (mechModel === 'maxwell') {
            newStress = (E1_safe * epsilon0_safe) * Math.exp(-E1_safe * nextTime / eta1_safe);
            newElasticStrain = newStress / E1_safe;
            newViscousStrain = epsilon0_safe - newElasticStrain;
          } else if (mechModel === 'kelvin') {
            newStress = E1_safe * epsilon0_safe;
            newElasticStrain = epsilon0_safe;
            newViscousStrain = epsilon0_safe;
          } else if (mechModel === 'sls_maxwell') {
            newStress = epsilon0_safe * (E1_safe + E2_safe * Math.exp(-E2_safe * nextTime / eta1_safe));
            newElasticStrain = epsilon0_safe; 
            newViscousStrain = epsilon0_safe * (1 - Math.exp(-E2_safe * nextTime / eta1_safe));
          } else if (mechModel === 'sls_kelvin') {
            const E_inf = (E1_safe * E2_safe) / (E1_safe + E2_safe);
            const E_trans = (E1_safe * E1_safe) / (E1_safe + E2_safe);
            const tau = eta1_safe / (E1_safe + E2_safe);
            newStress = epsilon0_safe * (E_inf + E_trans * Math.exp(-nextTime / tau));
            newElasticStrain = newStress / E1_safe;
            newViscousStrain = epsilon0_safe - newElasticStrain;
          } else if (mechModel === 'generalized_maxwell') {
            const sigma1 = epsilon0_safe * E2_safe * Math.exp(-E2_safe * nextTime / eta1_safe);
            const sigma2 = epsilon0_safe * E3_safe * Math.exp(-E3_safe * nextTime / eta2_safe);
            newStress = epsilon0_safe * E1_safe + sigma1 + sigma2;
            
            newViscousStrain = epsilon0_safe - sigma1 / E2_safe;
            newViscousStrain2 = epsilon0_safe - sigma2 / E3_safe;
            newElasticStrain = epsilon0_safe;
          }
        }
        
        // Final safety check before state update
        newStrain = safe(newStrain);
        newStress = safe(newStress);
        newElasticStrain = safe(newElasticStrain);
        newViscousStrain = safe(newViscousStrain);
        newViscousStrain2 = safe(newViscousStrain2);

        
        setTime(nextTime);
        setCurrentStrain(newStrain);
        setCurrentStress(newStress);
        setCurrentElasticStrain(newElasticStrain);
        setCurrentViscousStrain(newViscousStrain);
        setCurrentViscousStrain2(newViscousStrain2);

        setData(prev => {
          const newData = [...prev, {
            time: Number(nextTime.toFixed(1)),
            stress: newStress,
            strain: newStrain,
            elasticStrain: newElasticStrain,
            viscousStrain: newViscousStrain
          }];
          return newData.slice(-100);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, modulus, modulus2, modulus3, viscosity, viscosity2, testMode, mechModel, appliedStress, appliedStrain]);

  const handleReset = () => {
    setTime(0);
    setCurrentStrain(0);
    setCurrentStress(0);
    setCurrentElasticStrain(0);
    setCurrentViscousStrain(0);
    setCurrentViscousStrain2(0);
    setData([]);
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">橡胶黏弹性实验室</h1>
            <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest">科学机理可视化 v2.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-neutral-800 p-1 rounded-full">
            <button 
              onClick={() => setMode('mechanical')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${mode === 'mechanical' ? 'bg-neutral-100 text-neutral-900 shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              力学模型
            </button>
            <button 
              onClick={() => setMode('molecular')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${mode === 'molecular' ? 'bg-neutral-100 text-neutral-900 shadow-lg' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              分子模型
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-80 border-r border-neutral-800 bg-neutral-900/30 p-6 flex flex-col gap-8 overflow-y-auto">
          <section>
            <div className="flex items-center gap-2 mb-4 text-neutral-400">
              <Settings2 className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-widest">模拟参数</h2>
            </div>
            
            <div className="space-y-6">
              {mode === 'mechanical' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">选择物理模型</label>
                    <select 
                      value={mechModel}
                      onChange={(e) => { setMechModel(e.target.value as MechModel); handleReset(); }}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="sls_maxwell">SLS 模型 (Maxwell 形式)</option>
                      <option value="sls_kelvin">SLS 模型 (Kelvin 形式)</option>
                      <option value="generalized_maxwell">广义 Maxwell 模型</option>
                      <option value="maxwell">Maxwell 模型</option>
                      <option value="kelvin">Kelvin-Voigt 模型</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-neutral-500 uppercase mb-2 block">实验类型</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setTestMode('creep'); handleReset(); }}
                        className={`py-2 text-xs font-bold rounded-lg border ${testMode === 'creep' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'border-neutral-700 text-neutral-500'}`}
                      >
                        蠕变实验 (恒应力)
                      </button>
                      <button 
                        onClick={() => { setTestMode('relaxation'); handleReset(); }}
                        className={`py-2 text-xs font-bold rounded-lg border ${testMode === 'relaxation' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'border-neutral-700 text-neutral-500'}`}
                      >
                        松弛实验 (恒应变)
                      </button>
                    </div>
                  </div>
                </>
              )}

              {testMode === 'creep' ? (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-300">外加应力 (σ₀)</label>
                    <span className="text-sm font-mono text-emerald-400">{appliedStress.toFixed(2)} MPa</span>
                  </div>
                  <input 
                    type="range" min="0" max="5" step="0.1" value={appliedStress}
                    onChange={(e) => setAppliedStress(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-300">外加应变 (ε₀)</label>
                    <span className="text-sm font-mono text-blue-400">{appliedStrain.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min="0" max="2" step="0.1" value={appliedStrain}
                    onChange={(e) => setAppliedStrain(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-neutral-300">
                    {mechModel === 'generalized_maxwell' ? '长期模量 (E₀)' : '主弹性模量 (E₁)'}
                  </label>
                  <span className="text-sm font-mono text-amber-400">{modulus.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0.5" max="5" step="0.1" value={modulus}
                  onChange={(e) => setModulus(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {(mechModel === 'sls_maxwell' || mechModel === 'sls_kelvin' || mechModel === 'generalized_maxwell') && (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-300">
                      {mechModel === 'generalized_maxwell' ? '支路1 模量 (E₁)' : '副弹性模量 (E₂)'}
                    </label>
                    <span className="text-sm font-mono text-amber-400">{modulus2.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="5" step="0.1" value={modulus2}
                    onChange={(e) => setModulus2(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              )}

              {mechModel === 'generalized_maxwell' && (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-300">支路2 模量 (E₂)</label>
                    <span className="text-sm font-mono text-amber-400">{modulus3.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="5" step="0.1" value={modulus3}
                    onChange={(e) => setModulus3(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-neutral-300">
                    {mechModel === 'generalized_maxwell' ? '支路1 黏度 (η₁)' : '黏度系数 (η)'}
                  </label>
                  <span className="text-sm font-mono text-blue-400">{viscosity.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0.5" max="10" step="0.5" value={viscosity}
                  onChange={(e) => setViscosity(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {mechModel === 'generalized_maxwell' && (
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-neutral-300">支路2 黏度 (η₂)</label>
                    <span className="text-sm font-mono text-blue-400">{viscosity2.toFixed(1)}</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="20" step="0.5" value={viscosity2}
                    onChange={(e) => setViscosity2(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-8">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all ${isPlaying ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500 text-neutral-900 hover:bg-emerald-400'}`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlaying ? '暂停' : '开始实验'}
              </button>
              <button 
                onClick={handleReset}
                className="p-2.5 bg-neutral-800 text-neutral-300 rounded-xl hover:bg-neutral-700 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </section>

          <section className="mt-4 p-4 bg-neutral-800/50 rounded-2xl border border-neutral-700/50">
            <div className="flex items-center gap-2 mb-3 text-neutral-400">
              <Info className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-widest">科学背景</h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {mode === 'mechanical' 
                ? `当前使用 ${mechModel.toUpperCase()} 模型。${testMode === 'creep' ? '蠕变实验观察恒定应力下应变随时间的滞后增长。' : '应力松弛实验观察恒定应变下应力随时间的指数衰减。'}`
                : "橡胶的弹性本质上是熵弹性。交联点（Cross-links）防止了分子链间的永久滑移，使得橡胶具有良好的形状记忆能力。"}
            </p>
          </section>
        </aside>

        {/* Visualization Area */}
        <div className="flex-1 flex flex-col relative">
          {/* 3D Scene */}
          <div className="flex-1 relative">
            <ViscoelasticScene 
              mode={mode} 
              mechanicalModel={mechModel}
              strain={currentStrain} 
              elasticStrain={currentElasticStrain}
              viscousStrain={currentViscousStrain} 
              viscousStrain2={currentViscousStrain2}
            />
            
            {/* Overlay Stats */}
            <div className="absolute top-6 left-6 flex gap-4 pointer-events-none">
              <div className="px-4 py-2 bg-neutral-900/80 backdrop-blur border border-neutral-700 rounded-xl">
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-tighter">实时应变 (ε)</p>
                <p className="text-lg font-mono font-bold text-emerald-400">{currentStrain.toFixed(4)}</p>
              </div>
              <div className="px-4 py-2 bg-neutral-900/80 backdrop-blur border border-neutral-700 rounded-xl">
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-tighter">实时应力 (σ)</p>
                <p className="text-lg font-mono font-bold text-amber-400">{currentStress.toFixed(4)}</p>
              </div>
              <div className="px-4 py-2 bg-neutral-900/80 backdrop-blur border border-neutral-700 rounded-xl">
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-tighter">时间 (s)</p>
                <p className="text-lg font-mono font-bold text-neutral-200">{time.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Charts Panel */}
          <div className="h-64 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-neutral-400">
                <TrendingUp className="w-4 h-4" />
                <h2 className="text-xs font-bold uppercase tracking-widest">动态响应曲线</h2>
              </div>
            </div>
            
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#666" 
                    fontSize={10} 
                    tickFormatter={(val) => `${val}s`}
                  />
                  <YAxis stroke="#666" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="strain" 
                    name="应变 (Strain)" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    dot={false} 
                    isAnimationActive={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stress" 
                    name="应力 (Stress)" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    dot={false} 
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
