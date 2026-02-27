import React from "react";

const BarongMascot = ({ className }) => {
    return (
        <svg 
            className={className || "w-16 h-16"} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Soft Shadow behind the mascot */}
            <ellipse cx="50" cy="95" rx="30" ry="5" fill="#e5e7eb" />
            
            {/* Body (Barong Shirt) */}
            <path d="M25 90 C25 60, 40 50, 50 50 C60 50, 75 60, 75 90 Z" fill="#f8fafc" />
            
            {/* Barong subtle pattern (Embroidery lines) */}
            <line x1="50" y1="55" x2="50" y2="85" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="3 3"/>
            <path d="M43 60 Q50 65 43 75" stroke="#e2e8f0" strokeWidth="2" fill="none"/>
            <path d="M57 60 Q50 65 57 75" stroke="#e2e8f0" strokeWidth="2" fill="none"/>
            
            {/* Undershirt Collar */}
            <path d="M42 50 Q50 58 58 50" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1"/>
            
            {/* Head (Face) */}
            <circle cx="50" cy="35" r="22" fill="#fcd34d" />
            
            {/* Hair */}
            <path d="M28 35 C28 15, 72 15, 72 35 Z" fill="#1e293b" />
            
            {/* Cheeks */}
            <circle cx="38" cy="40" r="3" fill="#fbbf24" opacity="0.6"/>
            <circle cx="62" cy="40" r="3" fill="#fbbf24" opacity="0.6"/>

            {/* Eyes */}
            <circle cx="42" cy="32" r="2.5" fill="#1e293b" />
            <circle cx="58" cy="32" r="2.5" fill="#1e293b" />
            
            {/* Happy Smile */}
            <path d="M44 42 Q50 48 56 42" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none"/>
        </svg>
    );
};

export default BarongMascot;
