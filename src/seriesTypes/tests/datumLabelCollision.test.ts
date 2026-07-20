import {
    DatumLabelCollisionCandidate,
    selectVisibleDatumLabelIndexes,
    updateDatumLabelVisibility,
} from "../datumLabelCollision";

function candidate(
    index: number,
    primaryPosition: number,
    left: number,
    top: number,
    width = 20,
    height = 10
): DatumLabelCollisionCandidate {
    return {
        index,
        stableKey: String(index),
        primaryPosition,
        left,
        top,
        right: left + width,
        bottom: top + height,
    };
}

describe("selectVisibleDatumLabelIndexes", () => {
    it("сохраняет все разнесённые подписи", () => {
        const visibleIndexes = selectVisibleDatumLabelIndexes([
            candidate(0, 10, 0, 0),
            candidate(1, 40, 30, 0),
            candidate(2, 70, 60, 0),
        ]);

        expect(Array.from(visibleIndexes)).toEqual([0, 1, 2]);
    });

    it("прореживает плотную последовательность по фактическим границам", () => {
        const visibleIndexes = selectVisibleDatumLabelIndexes([
            candidate(0, 10, 0, 0),
            candidate(1, 20, 10, 0),
            candidate(2, 34, 24, 0),
        ]);

        expect(Array.from(visibleIndexes)).toEqual([0, 2]);
    });

    it("не считает коллизией подписи на разных вертикальных уровнях", () => {
        const visibleIndexes = selectVisibleDatumLabelIndexes([candidate(0, 10, 0, 0), candidate(1, 10, 0, 20)]);

        expect(Array.from(visibleIndexes)).toEqual([0, 1]);
    });

    it("выбирает победителя по экранной позиции, а не по порядку серий", () => {
        const visibleIndexes = selectVisibleDatumLabelIndexes([candidate(0, 20, 0, 0), candidate(1, 10, 0, 0)]);

        expect(Array.from(visibleIndexes)).toEqual([1]);
    });

    it("разрешает подписи с расстоянием, равным заданному зазору", () => {
        const visibleIndexes = selectVisibleDatumLabelIndexes([candidate(0, 10, 0, 0), candidate(1, 32, 22, 0)], 2);

        expect(Array.from(visibleIndexes)).toEqual([0, 1]);
    });

    it("игнорирует кандидатов с невалидной геометрией", () => {
        const visibleIndexes = selectVisibleDatumLabelIndexes([
            candidate(0, 10, 0, 0),
            candidate(1, Number.NaN, 30, 0),
        ]);

        expect(Array.from(visibleIndexes)).toEqual([0]);
    });

    it("игнорирует кандидатов без видимой площади", () => {
        const visibleIndexes = selectVisibleDatumLabelIndexes([candidate(0, 10, 0, 0, 0, 0), candidate(1, 10, 0, 0)]);

        expect(Array.from(visibleIndexes)).toEqual([1]);
    });

    it("стабильно разрешает точную коллизию независимо от входного порядка", () => {
        const laterKey = { ...candidate(0, 10, 0, 0), stableKey: "series-b" };
        const earlierKey = { ...candidate(1, 10, 0, 0), stableKey: "series-a" };

        expect(Array.from(selectVisibleDatumLabelIndexes([laterKey, earlierKey]))).toEqual([1]);
        expect(Array.from(selectVisibleDatumLabelIndexes([earlierKey, laterKey]))).toEqual([1]);
    });

    it("использует вертикальную ось sweep-line для горизонтального графика", () => {
        const visibleIndexes = selectVisibleDatumLabelIndexes(
            [candidate(0, 10, 0, 0), candidate(1, 40, 0, 30)],
            2,
            "vertical"
        );

        expect(Array.from(visibleIndexes)).toEqual([0, 1]);
    });
});

type FakeLabel = {
    dataset: Record<string, string>;
    style: { display: string };
    ownerDocument: {
        defaultView: {
            getComputedStyle: () => Pick<CSSStyleDeclaration, "display" | "visibility" | "opacity">;
        };
    };
    getBoundingClientRect: () => Pick<DOMRect, "left" | "top" | "right" | "bottom">;
};

function fakeLabel(
    stableKey: string,
    bounds: Pick<DOMRect, "left" | "top" | "right" | "bottom">,
    display = ""
): FakeLabel {
    const label: FakeLabel = {
        dataset: {
            datumLabelDisplay: display,
            datumLabelKey: stableKey,
            datumLabelPrimaryPosition: String(bounds.left),
        },
        style: { display },
        ownerDocument: {
            defaultView: {
                getComputedStyle: () => ({
                    display: label.style.display || "inline",
                    visibility: "visible",
                    opacity: "1",
                }),
            },
        },
        getBoundingClientRect: () => bounds,
    };

    return label;
}

function fakeContainer(labels: FakeLabel[]): SVGGElement {
    return {
        querySelectorAll: () => labels,
    } as unknown as SVGGElement;
}

describe("updateDatumLabelVisibility", () => {
    it("скрывает пересекающиеся подписи из общей SVG-группы", () => {
        const firstAxisLabel = fakeLabel("axis-a", { left: 0, top: 0, right: 20, bottom: 10 });
        const secondAxisLabel = fakeLabel("axis-b", { left: 10, top: 0, right: 30, bottom: 10 });

        updateDatumLabelVisibility(fakeContainer([secondAxisLabel, firstAxisLabel]), "horizontal");

        expect(firstAxisLabel.style.display).toBe("");
        expect(secondAxisLabel.style.display).toBe("none");
    });

    it("возвращает ранее скрытую подпись, когда для неё появляется место", () => {
        const firstLabel = fakeLabel("first", { left: 0, top: 0, right: 20, bottom: 10 });
        let secondBounds = { left: 10, top: 0, right: 30, bottom: 10 };
        const secondLabel = fakeLabel("second", secondBounds);
        secondLabel.getBoundingClientRect = () => secondBounds;
        const container = fakeContainer([firstLabel, secondLabel]);

        updateDatumLabelVisibility(container, "horizontal");
        expect(secondLabel.style.display).toBe("none");

        secondBounds = { left: 30, top: 0, right: 50, bottom: 10 };
        updateDatumLabelVisibility(container, "horizontal");
        expect(secondLabel.style.display).toBe("");
    });

    it("не позволяет настроенной как display none подписи скрыть видимую", () => {
        const hiddenLabel = fakeLabel("hidden", { left: 0, top: 0, right: 20, bottom: 10 }, "none");
        const visibleLabel = fakeLabel("visible", { left: 0, top: 0, right: 20, bottom: 10 });

        updateDatumLabelVisibility(fakeContainer([hiddenLabel, visibleLabel]), "horizontal");

        expect(hiddenLabel.style.display).toBe("none");
        expect(visibleLabel.style.display).toBe("");
    });
});
