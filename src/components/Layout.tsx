import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, PenTool, Layout as LayoutIcon, FileText, Globe, Home } from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/week1', label: '第一周：基础建设', icon: BookOpen },
    { path: '/week2', label: '第二周：词汇升级', icon: PenTool },
    { path: '/week3', label: '第三周：骨架搭建', icon: LayoutIcon },
    { path: '/week4', label: '第四周：核心攻坚', icon: FileText },
    { path: '/week5', label: '第五周：大师进阶', icon: Globe },
];

export function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
            {/* Header */}
            <header className="bg-blue-900 text-white shadow-lg z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-white text-blue-900 rounded-full flex items-center justify-center font-bold text-xl official-font">公</div>
                        <div>
                            <h1 className="text-xl font-bold tracking-wide">公文写作速录实战系统</h1>
                            <p className="text-xs text-blue-200 opacity-80">工信部风格 · 严谨 · 规范 · 高效</p>
                        </div>
                    </div>
                    <div className="text-sm hidden md:block">
                        学员状态：<span className="font-mono text-green-300">特训中</span>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 max-w-7xl mx-auto w-full">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r border-slate-200 hidden md:block">
                    <nav className="p-4 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-sm font-medium",
                                        isActive
                                            ? "bg-blue-50 text-blue-900 border-l-4 border-blue-600"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Mobile Nav (Simple) */}
                <div className="md:hidden w-full bg-white border-b border-slate-200 overflow-x-auto whitespace-nowrap p-2 flex space-x-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "px-3 py-2 rounded text-sm inline-block",
                                location.pathname === item.path ? "bg-blue-50 text-blue-900" : "text-slate-600"
                            )}
                        >
                            {item.label.split('：')[0]}
                        </Link>
                    ))}
                </div>

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
