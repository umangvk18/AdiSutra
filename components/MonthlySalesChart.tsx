"use client";

import { useState } from "react";
import type { MonthlySales } from "@/lib/types";

const SAGE = "#4F7C6C";
const TERRACOTTA = "#D98B5F";

const CHART_WIDTH = 360;
const CHART_HEIGHT = 100;
const LABEL_HEIGHT = 18;
const BAR_GAP = 4;

function formatCompact(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value}`;
}

export function MonthlySalesChart({ data }: { data: MonthlySales[] }) {
  const [selected, setSelected] = useState<number | null>(null);

  const maxValue = Math.max(...data.map((d) => d.total), 1);
  const barSlot = CHART_WIDTH / data.length;
  const barWidth = Math.max(4, barSlot - BAR_GAP);

  return (
    <div className="rounded-2xl border border-gold/20 bg-white p-4">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-medium text-sage-dark/80">Monthly Sales</h2>
        {selected !== null && (
          <span className="text-sm font-medium text-sage-dark">
            {data[selected].month}: ₹{data[selected].total}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + LABEL_HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Monthly sales, last 12 months"
      >
        {/* baseline */}
        <line
          x1={0}
          y1={CHART_HEIGHT}
          x2={CHART_WIDTH}
          y2={CHART_HEIGHT}
          stroke="#C9A15A"
          strokeOpacity={0.25}
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const barHeight = Math.max(1, (d.total / maxValue) * (CHART_HEIGHT - 8));
          const x = i * barSlot + BAR_GAP / 2;
          const y = CHART_HEIGHT - barHeight;
          const isSelected = selected === i;
          const isMax = d.total === maxValue && d.total > 0;
          return (
            <g
              key={d.month}
              onClick={() => setSelected(isSelected ? null : i)}
              className="cursor-pointer"
            >
              {/* larger invisible hit target than the visible bar */}
              <rect x={i * barSlot} y={0} width={barSlot} height={CHART_HEIGHT} fill="transparent" />
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                fill={isSelected ? TERRACOTTA : SAGE}
                opacity={isSelected || selected === null ? 1 : 0.4}
              />
              {isMax && selected === null && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#33473F"
                  opacity={0.6}
                >
                  {formatCompact(d.total)}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={CHART_HEIGHT + 13}
                textAnchor="middle"
                fontSize={9}
                fill="#33473F"
                opacity={0.5}
              >
                {d.month.split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
