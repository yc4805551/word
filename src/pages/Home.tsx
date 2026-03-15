import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Home() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4 py-10">
                <h2 className="text-3xl font-bold text-blue-900 official-font">欢迎进入</h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    本系统旨在将您打造为一名既具速度又有深度的公文高手。
                    请按照周次循序渐进，或者进入快速画布直接开启智能创作。
                </p>
            </div>

            {/* Canvas Entry */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-6 h-6 text-blue-200" />
                            <h3 className="text-2xl font-bold official-font">只能快速画布 (公文流转处理站)</h3>
                        </div>
                        <p className="text-blue-100 max-w-xl text-lg opacity-90">
                            支持直接导入Word，边写边查错，AI深度润色，最后**一键导出标准公文格式**。
                        </p>
                    </div>
                    <Link to="/canvas" className="shrink-0 bg-white text-blue-700 px-6 py-3 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg flex items-center gap-2 group-hover:shadow-blue-900/50">
                        进入画布 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-xl hover:shadow-md transition-shadow">
                    <div className="h-2 w-12 bg-blue-600 mb-4 rounded-full"></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">第一周：基础建设</h3>
                    <p className="text-slate-600 mb-4">解决拼音混淆，建立高频词汇肌肉记忆。</p>
                    <Link to="/week1" className="text-blue-600 font-medium flex items-center hover:underline">
                        开始训练 <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>

                <div className="glass-panel p-6 rounded-xl hover:shadow-md transition-shadow">
                    <div className="h-2 w-12 bg-green-600 mb-4 rounded-full"></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">第二周：词汇升级</h3>
                    <p className="text-slate-600 mb-4">去口语化，掌握“工信部风”的庄重朴实。</p>
                    <Link to="/week2" className="text-blue-600 font-medium flex items-center hover:underline">
                        进入课程 <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>

                <div className="glass-panel p-6 rounded-xl hover:shadow-md transition-shadow">
                    <div className="h-2 w-12 bg-yellow-500 mb-4 rounded-full"></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">第三周：骨架搭建</h3>
                    <p className="text-slate-600 mb-4">掌握“三段论”逻辑，提炼“一眼入魂”的标题。</p>
                    <Link to="/week3" className="text-blue-600 font-medium flex items-center hover:underline">
                        进入课程 <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>

                <div className="glass-panel p-6 rounded-xl hover:shadow-md transition-shadow">
                    <div className="h-2 w-12 bg-red-600 mb-4 rounded-full"></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">第四周：核心攻坚</h3>
                    <p className="text-slate-600 mb-4">攻克“冒段”难关，学会信息的高密度压缩。</p>
                    <Link to="/week4" className="text-blue-600 font-medium flex items-center hover:underline">
                        进入课程 <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
