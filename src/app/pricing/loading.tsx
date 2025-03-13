export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-20">
          <div className="h-12 w-64 bg-[#111111] rounded-lg animate-pulse mx-auto mb-6" />
          <div className="h-6 w-96 bg-[#111111] rounded-lg animate-pulse mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-[#050505] border border-[#333333] p-8 h-full"
            >
              <div className="mb-6">
                <div className="h-8 w-32 bg-[#111111] rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-48 bg-[#111111] rounded-lg animate-pulse" />
              </div>

              <div className="mb-6">
                <div className="h-10 w-24 bg-[#111111] rounded-lg animate-pulse" />
              </div>

              <div className="space-y-4 mb-8">
                {[...Array(4)].map((_, j) => (
                  <div
                    key={j}
                    className="flex items-center space-x-3"
                  >
                    <div className="h-5 w-5 bg-[#111111] rounded-full animate-pulse" />
                    <div className="h-4 w-full bg-[#111111] rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="h-10 w-full bg-[#111111] rounded-md animate-pulse" />
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <div className="h-8 w-48 bg-[#111111] rounded-lg animate-pulse mx-auto mb-4" />
          <div className="h-4 w-96 bg-[#111111] rounded-lg animate-pulse mx-auto mb-8" />
          <div className="h-10 w-32 bg-[#111111] rounded-md animate-pulse mx-auto" />
        </div>
      </div>
    </div>
  );
} 