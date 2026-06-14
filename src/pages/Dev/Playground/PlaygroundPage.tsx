import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MediaToolkitTab } from "./components/MediaToolkitTab";
import { SpeechRecognitionTab } from "./components/SpeechRecognitionTab";

export function PlaygroundPage() {
  return (
    <div className="flex h-[100vh] flex-col bg-slate-50 dark:bg-slate-950">
      <div className="border-b bg-white px-6 py-4 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Developer Playground</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Test and experiment with various components and toolkits.
        </p>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <Tabs defaultValue="media-toolkit" className="flex h-full flex-col">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="media-toolkit">Media Toolkit</TabsTrigger>
            <TabsTrigger value="speech">Speech Recognition</TabsTrigger>
          </TabsList>

          <div className="mt-4 flex-1 overflow-auto rounded-xl border bg-white shadow-sm dark:bg-slate-900">
            <TabsContent
              value="media-toolkit"
              className="m-0 h-full data-[state=active]:block data-[state=inactive]:hidden">
              <MediaToolkitTab />
            </TabsContent>
            <TabsContent
              value="speech"
              className="m-0 h-full data-[state=active]:block data-[state=inactive]:hidden">
              <SpeechRecognitionTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
