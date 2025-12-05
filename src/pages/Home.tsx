import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function Home() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4 py-10">
                <h2 className="text-3xl font-bold text-blue-900 official-font">欢迎进入公文写作特训营</h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    本系统旨在将您打造为一名既具速度又有深度的公文高手。
                    请按照周次循序渐进，完成从基础输入到宏观篇章的全面进阶。
                </p>
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
