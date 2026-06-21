import { createSignal, createEffect, onCleanup, JSX, children } from "solid-js";

export type SplitPaneProps = {
  direction: "horizontal" | "vertical";
  initialSizes?: number[];
  minSizes?: number[];
  class?: string;
  onResize?: (sizes: number[]) => void;
  children: JSX.Element;
};

export function SplitPane(props: SplitPaneProps) {
  const resolved = children(() => props.children);
  const getChildren = () => {
    const res = resolved();
    const arr = Array.isArray(res) ? res : [res];
    return arr.filter(Boolean) as JSX.Element[];
  };

  const [sizes, setSizes] = createSignal<number[]>([]);
  const [containerSize, setContainerSize] = createSignal(0);
  let containerRef: HTMLDivElement | undefined;

  createEffect(() => {
    const items = getChildren();
    if (items.length === 0) return;
    if (sizes().length !== items.length) {
      if (props.initialSizes && props.initialSizes.length === items.length) {
        setSizes(props.initialSizes);
      } else {
        const equalSize = 100 / items.length;
        setSizes(items.map(() => equalSize));
      }
    }
  });

  const handleResizeStart = (index: number, e: MouseEvent) => {
    e.preventDefault();
    if (!containerRef) return;
    
    const startX = e.clientX;
    const startY = e.clientY;
    const isHorizontal = props.direction === "horizontal";
    
    const rect = containerRef.getBoundingClientRect();
    const totalSize = isHorizontal ? rect.width : rect.height;
    if (totalSize === 0) return;

    const startSizes = [...sizes()];
    const prevSize = startSizes[index]!;
    const nextSize = startSizes[index + 1]!;
    const totalPairSize = prevSize + nextSize;
    
    const minPrev = props.minSizes?.[index] ? (props.minSizes[index]! / totalSize) * 100 : 5;
    const minNext = props.minSizes?.[index + 1] ? (props.minSizes[index + 1]! / totalSize) * 100 : 5;

    const onMove = (ev: MouseEvent) => {
      const delta = isHorizontal ? ev.clientX - startX : ev.clientY - startY;
      const deltaPercent = (delta / totalSize) * 100;
      
      let newPrev = prevSize + deltaPercent;
      let newNext = nextSize - deltaPercent;
      
      if (newPrev < minPrev) {
        newPrev = minPrev;
        newNext = totalPairSize - minPrev;
      } else if (newNext < minNext) {
        newNext = minNext;
        newPrev = totalPairSize - minNext;
      }
      
      const newSizes = [...startSizes];
      newSizes[index] = newPrev;
      newSizes[index + 1] = newNext;
      setSizes(newSizes);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      props.onResize?.(sizes());
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={containerRef}
      class={`flex size-full overflow-hidden ${props.direction === "vertical" ? "flex-col" : "flex-row"} ${props.class ?? ""}`}
    >
      <Index each={getChildren()}>
        {(child, index) => {
          const isLast = () => index === getChildren().length - 1;
          const size = () => sizes()[index] ?? (100 / getChildren().length);
          
          return (
            <>
              <div class="flex flex-col relative" style={{ "flex-basis": `${size()}%`, "flex-grow": 1, "flex-shrink": 1, "min-width": 0, "min-height": 0, overflow: "hidden" }}>
                {child()}
              </div>
              <Show when={!isLast()}>
                <div
                  class={`flex items-center justify-center bg-border-base transition-colors hover:bg-accent-base z-10`}
                  classList={{
                    "cursor-col-resize w-1 h-full -mx-[2px] relative": props.direction === "horizontal",
                    "cursor-row-resize h-1 w-full -my-[2px] relative": props.direction === "vertical",
                  }}
                  onMouseDown={(e) => handleResizeStart(index, e)}
                />
              </Show>
            </>
          );
        }}
      </Index>
    </div>
  );
}
