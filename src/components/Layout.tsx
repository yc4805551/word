import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, PenTool, Layout as LayoutIcon, FileText, Globe, Home, GitPullRequest, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import SettingsModal from './SettingsModal';

const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/week1', label: '第一周：基础建设', icon: BookOpen },
    { path: '/week2', label: '第二周：词汇升级', icon: PenTool },
    { path: '/week3', label: '第三周：句式训练', icon: GitPullRequest },
    { path: '/week4', label: '第四周：骨架搭建', icon: LayoutIcon },
    { path: '/week5', label: '第五周：核心攻坚', icon: FileText },
    { path: '/week6', label: '第六周：大师进阶', icon: Globe },
];

export function Layout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
            {/* Header */}
            <header className="bg-blue-900 text-white shadow-lg z-10 transition-all">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white text-blue-900 rounded-full flex items-center justify-center font-bold text-xl official-font">公</div>
                        <div>
                            <h1 className="text-xl font-bold tracking-wide">速录实战系统</h1>
                            <p className="text-xs text-blue-200 opacity-80">工信部风格 · 严谨 · 规范 · 高效</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 w-full overflow-hidden">
                {/* Sidebar */}
                <aside
                    className={`bg-white border-r border-slate-200 hidden md:flex flex-col transition-all duration-300 relative ${collapsed ? 'w-20' : 'w-64'
                        }`}
                >
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="absolute -right-3 top-6 bg-white border border-slate-200 rounded-full p-1 shadow-md hover:bg-slate-50 z-20"
                    >
                        {collapsed ? <ChevronRight className="w-4 h-4 text-slate-500" /> : <ChevronLeft className="w-4 h-4 text-slate-500" />}
                    </button>

                    <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            // Highlight Week 3 and 4 with specific styling
                            if (item.path === '/week3' || item.path === '/week4') {
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        className={({ isActive }) =>
                                            `flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                                : 'text-slate-600 hover:bg-white hover:shadow-md hover:text-blue-600'
                                            }`
                                        }
                                        title={collapsed ? item.label : ''}
                                    >
                                        <Icon className="w-5 h-5 flex-shrink-0" />
                                        <span className={`font-medium ml-3 transition-opacity duration-200 whitespace-nowrap ${collapsed ? 'opacity-0 w-0 overflow-hidden ml-0' : 'opacity-100'}`}>
                                            {item.label}
                                        </span>
                                    </NavLink>
                                );
                            }
                            // Modern standard link for others
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `flex items-center px-4 py-3 rounded-lg transition-all text-sm font-medium relative ${isActive
                                            ? "bg-blue-50 text-blue-900 border-l-4 border-blue-600"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`
                                    }
                                    title={collapsed ? item.label : ''}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    <span className={`transition-opacity duration-200 whitespace-nowrap ml-3 ${collapsed ? 'opacity-0 w-0 overflow-hidden ml-0' : 'opacity-100'}`}>
                                        {item.label}
                                    </span>
                                </NavLink>
                            );
                        })}
                    </nav>

                    {/* Settings Trigger */}
                    <div className="p-4 border-t border-slate-100">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex items-center w-full px-4 py-3 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all"
                            title={collapsed ? "系统设置" : ''}
                        >
                            <Settings className="w-5 h-5 flex-shrink-0" />
                            <span className={`font-medium ml-3 transition-opacity duration-200 whitespace-nowrap ${collapsed ? 'opacity-0 w-0 overflow-hidden ml-0' : 'opacity-100'}`}>
                                系统设置
                            </span>
                        </button>
                    </div>
                </aside>

                {/* Mobile Nav (Simple) */}
                <div className="md:hidden w-full bg-white border-b border-slate-200 overflow-x-auto whitespace-nowrap p-2 flex space-x-2 fixed bottom-0 left-0 z-50">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `px-3 py-2 rounded text-sm inline-block ${isActive ? "bg-blue-50 text-blue-900" : "text-slate-600"
                                }`
                            }
                        >
                            {item.label.split('：')[0]}
                        </NavLink>
                    ))}
                </div>

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-y-auto w-full">
                    {children}
                </main>
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}
