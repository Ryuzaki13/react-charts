const defaultDatumLabelCollisionGap = 2;

export type DatumLabelCollisionCandidate = {
    index: number;
    stableKey: string;
    primaryPosition: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
};

export type DatumLabelCollisionAxis = "horizontal" | "vertical";

/**
 * Выбирает стабильное подмножество подписей без пересечений в экранных координатах.
 * Сортировка по координате основной оси делает результат независимым от порядка серий
 * и корректно работает с неравномерными временными интервалами.
 */
export function selectVisibleDatumLabelIndexes(
    candidates: readonly DatumLabelCollisionCandidate[],
    gap = defaultDatumLabelCollisionGap,
    primaryAxis: DatumLabelCollisionAxis = "horizontal"
): Set<number> {
    const collisionGap = Number.isFinite(gap) ? Math.max(0, gap) : defaultDatumLabelCollisionGap;
    const activeCandidates: DatumLabelCollisionCandidate[] = [];
    const visibleIndexes = new Set<number>();

    const sortedCandidates = candidates
        .filter(isValidCandidate)
        .slice()
        .sort((left, right) => compareCandidates(left, right, primaryAxis));

    for (const candidate of sortedCandidates) {
        const candidateStart = getPrimaryStart(candidate, primaryAxis);

        for (let index = activeCandidates.length - 1; index >= 0; index--) {
            if (getPrimaryEnd(activeCandidates[index], primaryAxis) + collisionGap <= candidateStart) {
                activeCandidates.splice(index, 1);
            }
        }

        if (activeCandidates.some(visibleCandidate => intersects(candidate, visibleCandidate, collisionGap))) {
            continue;
        }

        activeCandidates.push(candidate);
        visibleIndexes.add(candidate.index);
    }

    return visibleIndexes;
}

/**
 * Измеряет уже размещённые SVG-подписи и скрывает только реально пересекающиеся.
 * Перед каждым измерением все подписи временно возвращаются в layout, поэтому resize
 * или изменение данных может снова показать подпись, для которой появилось место.
 */
export function updateDatumLabelVisibility(container: SVGGElement | null, primaryAxis: DatumLabelCollisionAxis): void {
    if (!container) {
        return;
    }

    const labels = Array.from(container.querySelectorAll<SVGTextElement>("[data-datum-label]"));

    for (const label of labels) {
        label.style.display = label.dataset.datumLabelDisplay ?? "";
    }

    const styleHiddenIndexes = new Set<number>();
    const candidates = labels.map((label, index): DatumLabelCollisionCandidate => {
        const bounds = label.getBoundingClientRect();
        const computedStyle = label.ownerDocument.defaultView?.getComputedStyle(label);
        const participatesInLayout =
            computedStyle?.display !== "none" &&
            computedStyle?.visibility !== "hidden" &&
            computedStyle?.visibility !== "collapse" &&
            Number(computedStyle?.opacity ?? 1) !== 0;

        if (!participatesInLayout) {
            styleHiddenIndexes.add(index);
        }

        return {
            index,
            stableKey: label.dataset.datumLabelKey ?? String(index),
            primaryPosition: participatesInLayout ? Number(label.dataset.datumLabelPrimaryPosition) : Number.NaN,
            left: bounds.left,
            top: bounds.top,
            right: bounds.right,
            bottom: bounds.bottom,
        };
    });
    const visibleIndexes = selectVisibleDatumLabelIndexes(candidates, defaultDatumLabelCollisionGap, primaryAxis);

    labels.forEach((label, index) => {
        const configuredDisplay = label.dataset.datumLabelDisplay ?? "";
        label.style.display = styleHiddenIndexes.has(index) || visibleIndexes.has(index) ? configuredDisplay : "none";
    });
}

function isValidCandidate(candidate: DatumLabelCollisionCandidate): boolean {
    return (
        [candidate.primaryPosition, candidate.left, candidate.top, candidate.right, candidate.bottom].every(
            Number.isFinite
        ) &&
        candidate.right > candidate.left &&
        candidate.bottom > candidate.top
    );
}

function compareCandidates(
    left: DatumLabelCollisionCandidate,
    right: DatumLabelCollisionCandidate,
    primaryAxis: DatumLabelCollisionAxis
): number {
    const primaryStartDifference = getPrimaryStart(left, primaryAxis) - getPrimaryStart(right, primaryAxis);
    const secondaryStartDifference = primaryAxis === "horizontal" ? left.top - right.top : left.left - right.left;

    if (primaryStartDifference || secondaryStartDifference || left.primaryPosition - right.primaryPosition) {
        return primaryStartDifference || secondaryStartDifference || left.primaryPosition - right.primaryPosition;
    }

    if (left.stableKey !== right.stableKey) {
        return left.stableKey < right.stableKey ? -1 : 1;
    }

    return left.index - right.index;
}

function getPrimaryStart(candidate: DatumLabelCollisionCandidate, primaryAxis: DatumLabelCollisionAxis): number {
    return primaryAxis === "horizontal" ? candidate.left : candidate.top;
}

function getPrimaryEnd(candidate: DatumLabelCollisionCandidate, primaryAxis: DatumLabelCollisionAxis): number {
    return primaryAxis === "horizontal" ? candidate.right : candidate.bottom;
}

function intersects(left: DatumLabelCollisionCandidate, right: DatumLabelCollisionCandidate, gap: number): boolean {
    return (
        left.left < right.right + gap &&
        left.right + gap > right.left &&
        left.top < right.bottom + gap &&
        left.bottom + gap > right.top
    );
}
