import React from 'react';

export const SkeletonCard = ({ className = "" }) => (
    <div className={`animate-pulse bg-slate-100 rounded-3xl ${className}`}>
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%] animate-shimmer"></div>
    </div>
);

export const SkeletonText = ({ width = "w-full", height = "h-4", className = "" }) => (
    <div className={`animate-pulse bg-slate-100 rounded-lg ${width} ${height} ${className}`}></div>
);

export const SkeletonCircle = ({ size = "w-12 h-12", className = "" }) => (
    <div className={`animate-pulse bg-slate-100 rounded-full ${size} ${className}`}></div>
);

export default function SkeletonLoader() {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <SkeletonCircle />
                <div className="flex-1 space-y-2">
                    <SkeletonText width="w-1/3" />
                    <SkeletonText width="w-1/2" />
                </div>
            </div>
            <SkeletonCard className="h-48 w-full" />
        </div>
    );
}
