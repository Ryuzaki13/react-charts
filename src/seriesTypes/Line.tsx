import { area, line } from "d3-shape";
import React from "react";

import { Axis, Datum, Series, SeriesElementType } from "../types";
import { isDefined, translate } from "../utils/Utils";
import useChartContext from "../utils/chartContext";
//
import { monotoneX } from "../utils/curveMonotone";
import { datumElementTransition } from "./datumElementTransition";

const defaultDatumLabelFontSize = 10;
const datumLabelOffset = 8;
const datumLabelEdgePadding = 2;

export default function Line<TDatum>({
    elementType,
    primaryAxis,
    secondaryAxis,
    series: allSeries,
}: {
    elementType: Exclude<SeriesElementType, "bar">;
    primaryAxis: Axis<TDatum>;
    secondaryAxis: Axis<TDatum>;
    series: Series<TDatum>[];
}) {
    const { getSeriesStatusStyle, getDatumStatusStyle, focusedDatumState, gridDimensions } = useChartContext<TDatum>();

    const curve = secondaryAxis.curve ?? monotoneX;

    const [focusedDatum] = focusedDatumState;

    return (
        <g
            style={{
                transform: translate(gridDimensions.left, gridDimensions.top),
            }}
        >
            {allSeries.map((series, i) => {
                const style = getSeriesStatusStyle(series, focusedDatum);

                let areaPath: null | string = null;

                if (elementType === "area") {
                    const _x = (datum: Datum<TDatum>) => getPrimary(datum, primaryAxis);
                    const _y1 = (datum: Datum<TDatum>) =>
                        clampPxToAxis(getSecondaryStart(datum, secondaryAxis), secondaryAxis);
                    const _y2 = (datum: Datum<TDatum>) =>
                        clampPxToAxis(getSecondary(datum, secondaryAxis), secondaryAxis);
                    const areaFn = area<Datum<TDatum>>(_x, _y1, _y2).curve(curve);

                    areaFn.defined(datum => [_x(datum), _y1(datum), _y2(datum)].every(isDefined));

                    areaPath = areaFn(series.datums);
                }

                const _x = (datum: Datum<TDatum>) => getPrimary(datum, primaryAxis);
                const _y = (datum: Datum<TDatum>) => getSecondary(datum, secondaryAxis);
                const lineFn = line<Datum<TDatum>>(_x, _y).curve(curve);
                lineFn.defined(datum => [_x(datum), _y(datum)].every(isDefined));

                const linePath =
                    elementType === "area" || elementType === "line"
                        ? (lineFn(series.datums) ?? undefined)
                        : undefined;

                const showDatumElements =
                    secondaryAxis.showDatumElements ?? (elementType === "bubble" || "onFocus");

                return (
                    <g key={`lines-${i}`}>
                        {areaPath ? (
                            <path
                                d={areaPath}
                                style={{
                                    strokeWidth: 2,
                                    opacity: 0.5,
                                    ...style,
                                    ...style.area,
                                }}
                            />
                        ) : null}
                        {linePath ? (
                            <path
                                d={linePath}
                                style={{
                                    strokeWidth: 2,
                                    ...style,
                                    ...style.line,
                                    fill: "none",
                                }}
                            />
                        ) : null}
                        {series.datums.map((datum, i) => {
                            const dataStyle = getDatumStatusStyle(datum, focusedDatum);

                            const radius = showDatumElements === "onFocus" ? (datum === focusedDatum ? 4 : 0) : 2;
                            const x = getX(datum, primaryAxis, secondaryAxis);
                            const y = getY(datum, primaryAxis, secondaryAxis);

                            if (![x, y].every(isDefined)) {
                                return null;
                            }

                            const show =
                                showDatumElements === "onFocus"
                                    ? datum === focusedDatum
                                    : (secondaryAxis.showDatumElements ?? elementType === "bubble");

                            return (
                                <circle
                                    key={i}
                                    ref={el => {
                                        datum.element = el;
                                    }}
                                    cx={x}
                                    cy={y}
                                    style={{
                                        // @ts-ignore
                                        r: radius,
                                        transition: datumElementTransition,
                                        ...style,
                                        ...style.circle,
                                        ...dataStyle,
                                        ...dataStyle.circle,
                                        ...(!show ? { opacity: 0 } : {}),
                                    }}
                                />
                            );
                        })}
                    </g>
                );
            })}
        </g>
    );
}

export function LineDatumLabels<TDatum>({
    focusedDatum: focusedDatumFromProps,
    primaryAxis,
    secondaryAxis,
    series: allSeries,
}: {
    focusedDatum: Datum<TDatum> | null;
    primaryAxis: Axis<TDatum>;
    secondaryAxis: Axis<TDatum>;
    series: Series<TDatum>[];
}) {
    const { getSeriesStatusStyle, getDatumStatusStyle, focusedDatumState, gridDimensions } = useChartContext<TDatum>();

    const [focusedDatumFromContext] = focusedDatumState;
    const showDatumLabels = secondaryAxis.showDatumLabels ?? false;
    const focusedDatum = showDatumLabels === "onFocus" ? focusedDatumFromProps : focusedDatumFromContext;

    if (!showDatumLabels) {
        return null;
    }

    return (
        <g
            style={{
                pointerEvents: "none",
                transform: translate(gridDimensions.left, gridDimensions.top),
            }}
        >
            {allSeries.map((series, seriesIndex) => {
                const style = getSeriesStatusStyle(series, focusedDatum);

                return (
                    <g key={`line-labels-${seriesIndex}`}>
                        {series.datums.map((datum, datumIndex) => {
                            const showLabel = showDatumLabels === "onFocus" ? datum === focusedDatum : showDatumLabels;

                            if (!showLabel) {
                                return null;
                            }

                            const x = getX(datum, primaryAxis, secondaryAxis);
                            const y = getY(datum, primaryAxis, secondaryAxis);

                            if (![x, y].every(isDefined)) {
                                return null;
                            }

                            const dataStyle = getDatumStatusStyle(datum, focusedDatum);
                            const layout = getDatumLabelLayout(x, y, gridDimensions, secondaryAxis.datumLabelStyle);

                            return (
                                <text
                                    key={`line-label-${datumIndex}`}
                                    data-datum-label=""
                                    data-datum-label-display={secondaryAxis.datumLabelStyle?.display}
                                    data-datum-label-key={JSON.stringify([
                                        secondaryAxis.id ?? null,
                                        series.id,
                                        datum.index,
                                    ])}
                                    data-datum-label-primary-position={primaryAxis.isVertical ? y : x}
                                    x={layout.x}
                                    y={layout.y}
                                    style={{
                                        fill:
                                            dataStyle.fill ??
                                            dataStyle.stroke ??
                                            style.fill ??
                                            style.stroke ??
                                            style.color ??
                                            "currentColor",
                                        dominantBaseline: layout.dominantBaseline,
                                        fontSize: defaultDatumLabelFontSize,
                                        pointerEvents: "none",
                                        textAnchor: layout.textAnchor,
                                        transition: "all .3s ease-out",
                                        ...secondaryAxis.datumLabelStyle,
                                    }}
                                >
                                    {getDatumLabel(datum, secondaryAxis)}
                                </text>
                            );
                        })}
                    </g>
                );
            })}
        </g>
    );
}

function getX<TDatum>(datum: Datum<TDatum>, primaryAxis: Axis<TDatum>, secondaryAxis: Axis<TDatum>): number {
    return primaryAxis.isVertical ? getSecondary(datum, secondaryAxis) : getPrimary(datum, primaryAxis);
}

function getY<TDatum>(datum: Datum<TDatum>, primaryAxis: Axis<TDatum>, secondaryAxis: Axis<TDatum>): number {
    return primaryAxis.isVertical ? getPrimary(datum, primaryAxis) : getSecondary(datum, secondaryAxis);
}

function getPrimary<TDatum>(datum: Datum<TDatum>, primaryAxis: Axis<TDatum>): number {
    let primary = primaryAxis.scale(datum.primaryValue) ?? NaN;

    if (primaryAxis.axisFamily === "band") {
        primary += primaryAxis.scale.bandwidth() / 2;
    }

    return primary;
}

function getSecondary<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>): number {
    if (secondaryAxis.stacked) {
        return secondaryAxis.scale(datum.stackData?.[1] ?? NaN) ?? NaN;
    }

    return secondaryAxis.scale(datum.secondaryValue) ?? NaN;
}

function getSecondaryStart<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>): number {
    if (secondaryAxis.stacked) {
        return secondaryAxis.scale(datum.stackData?.[0] ?? NaN) ?? NaN;
    }

    return secondaryAxis.scale(0) ?? NaN;
}

function getDatumLabel<TDatum>(datum: Datum<TDatum>, secondaryAxis: Axis<TDatum>) {
    return (secondaryAxis.formatters as { datumLabel: (value: any) => React.ReactNode }).datumLabel(
        datum.secondaryValue
    );
}

function getDatumLabelLayout<TDatum>(
    x: number,
    y: number,
    gridDimensions: { width: number; height: number },
    labelStyle: Axis<TDatum>["datumLabelStyle"]
) {
    const fontSize = getDatumLabelFontSize(labelStyle);
    const minX = datumLabelEdgePadding;
    const maxX = Math.max(minX, gridDimensions.width - datumLabelEdgePadding);
    const labelX = Math.max(minX, Math.min(x, maxX));
    const horizontalAnchorPadding = fontSize * 2;
    const textAnchor =
        x <= horizontalAnchorPadding
            ? "start"
            : x >= gridDimensions.width - horizontalAnchorPadding
              ? "end"
              : "middle";

    const aboveY = y - datumLabelOffset;
    const minBaselineY = fontSize + datumLabelEdgePadding;

    if (aboveY < minBaselineY) {
        const maxHangingY = Math.max(datumLabelEdgePadding, gridDimensions.height - fontSize - datumLabelEdgePadding);
        const belowY = Math.max(datumLabelEdgePadding, Math.min(y + datumLabelOffset, maxHangingY));

        return {
            x: labelX,
            y: belowY,
            dominantBaseline: "hanging",
            textAnchor,
        } as const;
    }

    return {
        x: labelX,
        y: Math.max(minBaselineY, Math.min(aboveY, gridDimensions.height - datumLabelEdgePadding)),
        dominantBaseline: "auto",
        textAnchor,
    } as const;
}

function getDatumLabelFontSize(labelStyle: React.CSSProperties | undefined) {
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

function clampPxToAxis<TDatum>(px: number, axis: Axis<TDatum>) {
    const range = axis.scale.range();
    if (axis.isVertical) {
        range.reverse();
    }

    return Math.max(range[0], Math.min(px, range[1]));
}
