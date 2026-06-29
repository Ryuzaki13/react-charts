import React from "react";

import useIsomorphicLayoutEffect from "../hooks/useIsomorphicLayoutEffect";
import { Axis, AxisLinear } from "../types";
import { translate } from "../utils/Utils";
import useChartContext from "../utils/chartContext";

import useMeasure from "./AxisLinear.useMeasure";

const defaultAxisLabelOffset = 36;
const axisLabelEllipsis = "...";

export default function AxisLinearComp<TDatum>(axis: Axis<TDatum>) {
    const [showRotated, setShowRotated] = React.useState(false);
    const { getOptions, gridDimensions, width, height } = useChartContext<TDatum>();

    const { dark, showDebugAxes } = getOptions();

    const elRef = React.useRef<SVGGElement>(null);

    useMeasure({
        axis,
        elRef,
        gridDimensions,
        showRotated,
        setShowRotated,
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
                                        style={{
                                            fontSize: 10,
                                            fill: dark ? "rgba(255,255,255, .7)" : "rgba(0,0,0, .7)",
                                            dominantBaseline: isRotated
                                                ? "central"
                                                : axis.position === "bottom"
                                                  ? "hanging"
                                                  : axis.position === "top"
                                                    ? "alphabetic"
                                                    : "central",
                                            textAnchor: isRotated
                                                ? "end"
                                                : axis.position === "right"
                                                  ? "start"
                                                  : axis.position === "left"
                                                    ? "end"
                                                    : "middle",
                                        }}
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
}: {
    axis: Axis<TDatum>;
    dark: boolean | undefined;
    rangeStart: number;
    rangeEnd: number;
    resolvedWidth: number;
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
    const x = axis.position === "left" ? -offset : resolvedWidth + offset;
    const rotation = axis.position === "left" ? -90 : 90;

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
    const labelText = React.useMemo(() => getTextFromReactNode(label), [label]);
    const [displayText, setDisplayText] = React.useState(labelText);
    const textRef = React.useRef<SVGTextElement>(null);

    useIsomorphicLayoutEffect(() => {
        const textEl = textRef.current;

        if (!textEl) {
            return;
        }

        const nextText = getEllipsizedText(textEl, labelText, maxLength);

        textEl.textContent = nextText;
        setDisplayText(current => (current === nextText ? current : nextText));
    }, [labelText, maxLength, style]);

    if (!labelText) {
        return null;
    }

    return (
        <text
            ref={textRef}
            aria-label={labelText}
            className="axisLabel"
            dominantBaseline="central"
            textAnchor="middle"
            transform={`rotate(${rotation}, ${x}, ${y})`}
            x={x}
            y={y}
            style={style}
        >
            {displayText}
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

function getTextFromReactNode(node: React.ReactNode): string {
    return normalizeAxisLabelText(readTextFromReactNode(node));
}

function readTextFromReactNode(node: React.ReactNode): string {
    if (node === null || typeof node === "undefined" || typeof node === "boolean") {
        return "";
    }

    if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
        return `${node}`;
    }

    if (Array.isArray(node)) {
        return node.map(readTextFromReactNode).join("");
    }

    if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
        return readTextFromReactNode(node.props.children);
    }

    return "";
}

function normalizeAxisLabelText(text: string) {
    return text.replace(/\s+/g, " ").trim();
}
