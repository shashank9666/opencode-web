import { For } from "solid-js"

export function BrowserSkeleton() {
  return (
    <div class="absolute inset-0 bg-white z-10 flex flex-col p-8 gap-8">
      {/* Header Skeleton */}
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
          <div class="flex flex-col gap-2">
            <div class="w-48 h-5 rounded bg-gray-200 animate-pulse" />
            <div class="w-32 h-4 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
        <div class="w-24 h-8 rounded bg-gray-100 animate-pulse" />
      </div>

      {/* Hero Image Skeleton */}
      <div class="w-full h-64 rounded-xl bg-gray-100 animate-pulse" />

      {/* Content Blocks */}
      <div class="flex flex-col gap-4">
        <div class="w-3/4 h-6 rounded bg-gray-200 animate-pulse" />
        <div class="w-full h-4 rounded bg-gray-100 animate-pulse" />
        <div class="w-full h-4 rounded bg-gray-100 animate-pulse" />
        <div class="w-5/6 h-4 rounded bg-gray-100 animate-pulse" />
      </div>
      
      {/* Grid Skeleton */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        <For each={[1, 2, 3]}>
          {() => (
            <div class="flex flex-col gap-3">
              <div class="w-full h-32 rounded-lg bg-gray-100 animate-pulse" />
              <div class="w-2/3 h-5 rounded bg-gray-200 animate-pulse" />
              <div class="w-full h-3 rounded bg-gray-100 animate-pulse" />
              <div class="w-4/5 h-3 rounded bg-gray-100 animate-pulse" />
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
