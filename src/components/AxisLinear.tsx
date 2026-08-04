import React from "react";

import useIsomorphicLayoutEffect from "../hooks/useIsomorphicLayoutEffect";
import { Axis, AxisLinear } from "../types";
import { translate } from "../utils/Utils";
import useChartContext from "../utils/chartContext";

import useMeasure from "./AxisLinear.useMeasure";

const defaultAxisLabelOffset = 36;
const axisLabelEllipsis = "...";

export function resolveAxisTickLabelStyle(
    dark: boolean | undefined,
    dominantBaseline: React.CSSProperties["dominantBaseline"],
    textAnchor: React.CSSProperties["textAnchor"],
    tickLabelStyle: React.CSSProperties | undefined
): React.CSSProperties {
    return {
        fontSize: 10,
        fill: dark ? "rgba(255,255,255, .7)" : "rgba(0,0,0, .7)",
        dominantBaseline,
        textAnchor,
        ...tickLabelStyle,
    };
}

function getElementRect(el: Element) {
    return el.getBoundingClientRect();
}

export default function AxisLinearComp<TDatum>(axis: Axis<TDatum>) {
    const [showRotated, setShowRotated] = React.useState(false);
    const [axisLabelTickOffset, setAxisLabelTickOffset] = React.useState(0);
    const { getOptions, gridDimensions, width, height } = useChartContext<TDatum>();

    const { dark, showDebugAxes } = getOptions();

    const elRef = React.useRef<SVGGElement>(null);

    useMeasure({
        axis,
        elRef,
        gridDimensions,
        showRotated,
        axisLabelTickOffset,
        setShowRotated,
    });

    useIsomorphicLayoutEffect(() => {
        if (!axis.isVertical || !elRef.current) {
            setAxisLabelTickOffset(current => (current === 0 ? current : 0));
            return;
        }

        const axisEl = elRef.current.querySelector(`.Axis-Group.inner .domainAndTicks`);
        const domainEl = elRef.current.querySelector(`.Axis-Group.inner .domain`);

        if (!axisEl || !domainEl) {
            return;
        }

        const axisRect = getElementRect(axisEl);
        const domainRect = getElementRect(domainEl);
        const nextOffset =
            axis.position === "left"
                ? Math.round(Math.max(0, domainRect.left - axisRect.left))
                : Math.round(Math.max(0, axisRect.right - domainRect.right));

        setAxisLabelTickOffset(current => (current === nextOffset ? current : nextOffset));
    });

    const renderAxis = (isOuter: boolean) => {
        const isRotated = !isOuter && showRotated;

        const scale = isOuter ? axis.outerScale : axis.scale;
        const [rangeStart, rangeEnd] = scale.range();

        const getTicks = () => {
            const anyAxis = axis as AxisLinear<TDatum>;

            if ((anyAxis as AxisLinear<TDatum>).outerScale.ticks!) {
                if (typeof anyAxis.tickCount === "number") {
                    return anyAxis.outerScale.ticks(anyAxis.tickCount);
                }

                const autoSpacing = anyAxis.isVertical ? 40 : 80;
                const range = anyAxis.outerScale.range();
                const num = Math.abs(range[1] - range[0]) / autoSpacing;

                return anyAxis.outerScale.ticks(num);
            }

            return anyAxis.outerScale.domain();
        };

        const resolvedHeight = isOuter ? height : gridDimensions.height;
        const resolvedWidth = isOuter ? width : gridDimensions.width;

        const [lineFrom, lineTo] =
            axis.position === "left"
                ? [
                      { x: 0, y: rangeStart },
                      { x: 0, y: rangeEnd },
                  ]
                : axis.position === "right"
                  ? [
                        { x: resolvedWidth, y: rangeStart },
                        { x: resolvedWidth, y: rangeEnd },
                    ]
                  : axis.position === "top"
                    ? [
                          { x: rangeStart, y: 0 },
                          { x: rangeEnd, y: 0 },
                      ]
                    : [
                          { x: rangeStart, y: resolvedHeight },
                          { x: rangeEnd, y: resolvedHeight },
                      ];

        const ticks = getTicks().map(tick => {
            const px = getTickPx(scale, tick);

            const [from, to, gridTo] =
                axis.position === "left"
                    ? [
                          { x: 0, y: px },
                          { x: -8, y: px },
                          { x: resolvedWidth, y: px },
                      ]
                    : axis.position === "right"
                      ? [
                            { x: resolvedWidth, y: px },
                            { x: resolvedWidth + 8, y: px },
                            { x: 0, y: px },
                        ]
                      : axis.position === "top"
                        ? [
                              { x: px, y: 0 },
                              { x: px, y: -8 },
                              { x: px, y: resolvedHeight },
                          ]
                        : [
                              { x: px, y: resolvedHeight },
                              { x: px, y: resolvedHeight + 8 },
                              { x: px, y: 0 },
                          ];

            return {
                value: tick,
                from,
                to,
                gridTo,
            };
        });

        return (
            <g
                key={`Axis-Group ${isOuter ? "outer" : "inner"}`}
                className={`Axis-Group ${isOuter ? "outer" : "inner"}`}
                style={{
                    transform: isOuter ? undefined : translate(gridDimensions.left, gridDimensions.top),
                }}
            >
                <g
                    className={`Axis`}
                    style={{
                        ...(isOuter
                            ? {
                                  opacity: showDebugAxes ? 0.5 : 0,
                                  pointerEvents: "none",
                              }
                            : {
                                  opacity: 1,
                                  pointerEvents: "all",
                              }),
                    }}
                >
                    <g className="domainAndTicks">
                        <line
                            className="domain"
                            x1={lineFrom.x}
                            y1={lineFrom.y}
                            x2={lineTo.x}
                            y2={lineTo.y}
                            stroke={dark ? "rgba(255,255,255, .2)" : "rgba(0,0,0, .2)"}
                        />
                        {ticks.map((tick, i) => {
                            let { x: tickLabelX, y: tickLabelY } = tick.to;

                            if (axis.position === "top") {
                                tickLabelY -= 5;
                            } else if (axis.position === "bottom") {
                                tickLabelY += 5;
                            } else if (axis.position === "left") {
                                tickLabelX -= 5;
                            } else if (axis.position === "right") {
                                tickLabelX += 5;
                            }

                            return (
                                <g key={`vx-tick-${tick}-${i}`} className={"tick"}>
                                    {!isOuter ? (
                                        <line
                                            x1={tick.from.x}
                                            y1={tick.from.y}
                                            x2={tick.to.x}
                                            y2={tick.to.y}
                                            stroke={dark ? "rgba(255,255,255, .2)" : "rgba(0,0,0, .2)"}
                                        />
                                    ) : null}
                                    <text
                                        className="tickLabel"
                                        style={resolveAxisTickLabelStyle(
                                            dark,
                                            isRotated
                                                ? "central"
                                                : axis.position === "bottom"
                                                  ? "hanging"
                                                  : axis.position === "top"
                                                    ? "alphabetic"
                                                    : "central",
                                            isRotated
                                                ? "end"
                                                : axis.position === "right"
                                                  ? "start"
                                                  : axis.position === "left"
                                                    ? "end"
                                                    : "middle",
                                            axis.tickLabelStyle
                                        )}
                                        transform={`translate(${tickLabelX}, ${tickLabelY}) rotate(${
                                            isRotated ? (axis.position === "top" ? 60 : -60) : 0
                                        })`}
                                    >
                                        {(axis as AxisLinear<any>).formatters.scale(tick.value as number)}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                    <g className="grid">
                        {ticks.map((tick, i) => {
                            return (
                                <g key={`vx-tick-${tick}-${i}`} className={"tick"}>
                                    {(axis.showGrid ?? true) && !isOuter ? (
                                        <line
                                            x1={tick.from.x}
                                            y1={tick.from.y}
                                            x2={tick.gridTo.x}
                                            y2={tick.gridTo.y}
                                            stroke={dark ? "rgba(255,255,255, .05)" : "rgba(0,0,0, .05)"}
                                        />
                                    ) : null}
                                </g>
                            );
                        })}
                    </g>
                    {!isOuter ? (
                        <AxisLabel
                            axis={axis}
                            dark={dark}
                            rangeStart={rangeStart}
                            rangeEnd={rangeEnd}
                            resolvedWidth={resolvedWidth}
                            tickLabelOffset={axisLabelTickOffset}
                        />
                    ) : null}
                </g>
            </g>
        );
    };

    return axis.show ? (
        <g ref={elRef}>
            {renderAxis(false)}
            {renderAxis(true)}
        </g>
    ) : null;
}

function getTickPx<TDatum>(scale: Axis<TDatum>["scale"], value: any) {
    let px = scale(value) ?? NaN;

    // @ts-ignore
    if (scale.bandwidth) {
        // @ts-ignore
        return px + scale.bandwidth() / 2;
    }

    return px;
}

function AxisLabel<TDatum>({
    axis,
    dark,
    rangeStart,
    rangeEnd,
    resolvedWidth,
    tickLabelOffset,
}: {
    axis: Axis<TDatum>;
    dark: boolean | undefined;
    rangeStart: number;
    rangeEnd: number;
    resolvedWidth: number;
    tickLabelOffset: number;
}) {
    const labelStyle = React.useMemo<React.CSSProperties>(
        () => ({
            fontSize: 11,
            fill: dark ? "rgba(255,255,255, .8)" : "rgba(0,0,0, .8)",
            ...axis.labelStyle,
            whiteSpace: "nowrap",
        }),
        [axis.labelStyle, dark]
    );

    if (
        axis.label === null ||
        typeof axis.label === "undefined" ||
        typeof axis.label === "boolean" ||
        (axis.position !== "left" && axis.position !== "right")
    ) {
        return null;
    }

    const offset = axis.labelOffset ?? defaultAxisLabelOffset;
    const y = rangeStart + (rangeEnd - rangeStart) / 2;
    const resolvedOffset = tickLabelOffset + offset;
    const x = axis.position === "left" ? -resolvedOffset : resolvedWidth + resolvedOffset;
    const rotation = -90;

    return (
        <AxisLabelText
            label={axis.label}
            maxLength={Math.abs(rangeEnd - rangeStart)}
            x={x}
            y={y}
            rotation={rotation}
            style={labelStyle}
        />
    );
}

function AxisLabelText({
    label,
    maxLength,
    rotation,
    style,
    x,
    y,
}: {
    label: React.ReactNode;
    maxLength: number;
    rotation: number;
    style: React.CSSProperties;
    x: number;
    y: number;
}) {
    const [measuredLabel, setMeasuredLabel] = React.useState<{
        label: React.ReactNode;
        maxLength: number;
        style: React.CSSProperties;
        text: string;
    } | null>(null);
    const textRef = React.useRef<SVGTextElement>(null);
    const measuredText =
        measuredLabel &&
        measuredLabel.label === label &&
        measuredLabel.maxLength === maxLength &&
        measuredLabel.style === style
            ? measuredLabel.text
            : null;

    useIsomorphicLayoutEffect(() => {
        const textEl = textRef.current;

        if (!textEl) {
            return;
        }

        const labelText = normalizeAxisLabelText(textEl.textContent ?? "");
        const nextText = getEllipsizedText(textEl, labelText, maxLength);

        textEl.textContent = nextText;
        setMeasuredLabel(current => {
            if (
                current &&
                current.label === label &&
                current.maxLength === maxLength &&
                current.style === style &&
                current.text === nextText
            ) {
                return current;
            }

            return {
                label,
                maxLength,
                style,
                text: nextText,
            };
        });
    }, [label, maxLength, style]);

    return (
        <text
            ref={textRef}
            aria-label={measuredText ?? undefined}
            className="axisLabel"
            dominantBaseline="central"
            textAnchor="middle"
            transform={`rotate(${rotation}, ${x}, ${y})`}
            x={x}
            y={y}
            style={style}
        >
            {measuredText ?? label}
        </text>
    );
}

function getEllipsizedText(textEl: SVGTextElement, text: string, maxLength: number) {
    if (!Number.isFinite(maxLength) || maxLength <= 0) {
        return "";
    }

    if (typeof textEl.getComputedTextLength !== "function") {
        return text;
    }

    try {
        textEl.textContent = text;

        if (textEl.getComputedTextLength() <= maxLength) {
            return text;
        }

        textEl.textContent = axisLabelEllipsis;

        if (textEl.getComputedTextLength() > maxLength) {
            return "";
        }

        let low = 0;
        let high = text.length;
        let best = axisLabelEllipsis;

        while (low <= high) {
            const middle = Math.floor((low + high) / 2);
            const candidate = `${text.slice(0, middle).trimEnd()}${axisLabelEllipsis}`;

            textEl.textContent = candidate;

            if (textEl.getComputedTextLength() <= maxLength) {
                best = candidate;
                low = middle + 1;
            } else {
                high = middle - 1;
            }
        }

        return best;
    } catch {
        return text;
    }
}

function normalizeAxisLabelText(text: string) {
    return text.replace(/\s+/g, " ").trim();
}
