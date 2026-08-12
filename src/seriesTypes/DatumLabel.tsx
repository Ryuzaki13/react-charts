import React from "react";

import { type Axis, type Datum, type DatumStyles, type Series, type SeriesStyles } from "../types";

/** Стандартный размер подписи, который используется без явного datumLabelStyle.fontSize. */
export const defaultDatumLabelFontSize = 10;

/** Геометрия одной подписи после расчёта положения относительно datum-элемента. */
export type DatumLabelLayout = {
    x: number;
    y: number;
    dominantBaseline: React.CSSProperties["dominantBaseline"];
    textAnchor: React.CSSProperties["textAnchor"];
    primaryPosition: number;
};

/**
 * Рендерит общую SVG-подпись для line и bar серий.
 * Data-атрибуты связывают элемент с единым механизмом подавления коллизий в Chart.
 */
export function DatumLabel<TDatum>({
    datum,
    layout,
    secondaryAxis,
    series,
    seriesStyle,
    datumStyle,
}: {
    datum: Datum<TDatum>;
    layout: DatumLabelLayout;
    secondaryAxis: Axis<TDatum>;
    series: Series<TDatum>;
    seriesStyle: SeriesStyles;
    datumStyle: DatumStyles;
}) {
    const formatDatumLabel = secondaryAxis.formatters.datumLabel as (value: unknown) => React.ReactNode;

    return (
        <text
            data-datum-label=""
            data-datum-label-display={secondaryAxis.datumLabelStyle?.display}
            data-datum-label-key={JSON.stringify([secondaryAxis.id ?? null, series.id, datum.index])}
            data-datum-label-primary-position={layout.primaryPosition}
            x={layout.x}
            y={layout.y}
            style={{
                fill:
                    datumStyle.fill ??
                    datumStyle.stroke ??
                    seriesStyle.fill ??
                    seriesStyle.stroke ??
                    seriesStyle.color ??
                    "currentColor",
                dominantBaseline: layout.dominantBaseline,
                fontSize: defaultDatumLabelFontSize,
                pointerEvents: "none",
                textAnchor: layout.textAnchor,
                transition: "all .3s ease-out",
                ...secondaryAxis.datumLabelStyle,
            }}
        >
            {formatDatumLabel(datum.secondaryValue)}
        </text>
    );
}

/** Возвращает числовой размер шрифта для расчёта отступов подписи у границ области построения. */
export function getDatumLabelFontSize(labelStyle: React.CSSProperties | undefined): number {
    const fontSize = labelStyle?.fontSize;

    if (typeof fontSize === "number") {
        return fontSize;
    }

    if (typeof fontSize === "string") {
        const parsed = parseFloat(fontSize);
        return Number.isNaN(parsed) ? defaultDatumLabelFontSize : parsed;
    }

    return defaultDatumLabelFontSize;
}
