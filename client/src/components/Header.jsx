import React from 'react';
import { Settings, History } from 'lucide-react';

const Header = () => {
    return (
        <header className="px-6 h-16 flex justify-between items-center bg-[#0b1120] border-b border-white/[0.05] z-50">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M2 12h20M7 8l-2 2 2 2M17 8l2 2-2 2" />
                    </svg>
                </div>
                <h1 className="text-sm font-bold tracking-tight text-white uppercase tracking-wider">AI Voice Assistant</h1>
            </div>

            {/* <div className="flex items-center gap-4">
                 <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 ml-2 flex-shrink-0">
                    <img
                        src=""
                        alt="User Avatar"
                        className="w-full h-full object-cover"
                        style={{ width: '32px', height: '32px' }}
                    />
                </div> 
        </div> */}
        </header >
    );
};

export default Header;
