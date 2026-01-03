"use client";

export const runtime = 'edge';

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, generateId } from "ai";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronDown } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button"; // 补回这行导入
import { db, type Message } from "@/lib/db";
import { models } from "@/lib/models";
import { getStoredModel } from "@/lib/utils";

// 动态导入 UI 组件，禁用 SSR 以剥离代码体积
const ChatList = dynamic(() => import("@/components/chat-list"), { ssr: false });
const ChatInput = dynamic(() => import("@/components/chat-input"), { ssr: false });
const AuthDialog = dynamic(() => import("@/components/auth-dialog"), { ssr: false });
const Footer = dynamic(() => import("@/components/footer"), { ssr: false });

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const Page = () => {
  const { session_id } = useParams() as { session_id: string };
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") !== null;
  const [loaded, setLoaded] = useState(isNew);
  const [showToBottom, setShowToBottom] = useState(false);
  const chatListRef = useRef<HTMLDivElement>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const initMessages = useLiveQuery(
    () =>
      db.message
        .where("sessionId")
        .equals(session_id)
        .limit(100)
        .sortBy("createdAt"),
    [session_id],
  );

  const { messages, sendMessage, status, setMessages, stop, regenerate } =
    useChat<Message>({
      transport: new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => {
          const { id, provider } = getStoredModel("CF_AI_MODEL");

          return {
            headers: {
              Authorization: localStorage.getItem("CF_AI_PASSWORD") ?? "",
            },
            body: {
              messages: messages.slice(-10),
              model: id,
              provider,
              search: localStorage.getItem("CF_AI_SEARCH_ENABLED") === "true",
            },
          };
        },
      }),
      onFinish: ({ message, isError }) => {
        if (!isError) {
          db.message.add({
            ...message,
            sessionId: session_id,
            createdAt: new Date(),
          });
          db.session.update(session_id, {
            updatedAt: new Date(),
          });
        }
      },
      onError: async (error) => {
        if (error.message === "Unauthorized") {
          setAuthDialogOpen(true);
          return;
        }
        toast.error("Unknown error occurred. Please try again.");
      },
    });

  const scrollToBottom = useCallback(
    (behavior: "smooth" | "instant" = "smooth") => {
      chatListRef.current?.scrollTo({
        top: chatListRef.current.scrollHeight,
        behavior,
      });
    },
    [],
  );

  useEffect(() => {
    if (initMessages && !loaded) {
      setMessages(initMessages);
      setLoaded(true);
    }
  }, [initMessages, setMessages, loaded]);

  useEffect(() => {
    if (isNew && initMessages) {
      const text = initMessages[0].parts.find((i) => i.type === "text")?.text;
      const files = initMessages[0].parts.filter((i) => i.type === "file");
      if (text) {
        sendMessage({ text, files });
        history.replaceState(null, "", location.pathname);
      }
    }
  }, [isNew, initMessages, sendMessage]);

  useEffect(() => {
    if (status === "streaming" && chatListRef.current && messages.length) {
      if (
        chatListRef.current.scrollHeight -
          chatListRef.current.scrollTop -
          chatListRef.current.clientHeight < 250
      ) {
        scrollToBottom();
      }
    }
  }, [status, messages, scrollToBottom]);

  useEffect(() => {
    const onScroll = debounce(() => {
      if (chatListRef.current) {
        if (
          chatListRef.current.scrollTop + chatListRef.current.clientHeight <
          chatListRef.current.scrollHeight - 100
        ) {
          startTransition(() => setShowToBottom(true));
        } else {
          startTransition(() => setShowToBottom(false));
        }
      }
    }, 100);
    chatListRef.current?.addEventListener("scroll", onScroll);
    return () => chatListRef.current?.removeEventListener("scroll", onScroll);
  }, []);

  const onSendMessage = async (data: any) => {
    const { text, files } = data;
    await db.message.add({
      id: generateId(),
      parts: [...(files ?? []), { type: "text", text }],
      role: "user",
      sessionId: session_id,
      createdAt: new Date(),
    });
    await db.session.update(session_id, { updatedAt: new Date() });
    scrollToBottom();
    await sendMessage({ text, files });
  };

  return (
    <div className="flex flex-col h-screen">
      <div
        ref={chatListRef}
        className="overflow-y-auto scrollbar px-2"
        style={{ scrollbarGutter: "stable both-edges" }}
      >
        <ChatList
          status={status}
          messages={messages}
          className="pt-16 pb-60 max-w-3xl mx-auto"
        />
      </div>

      <div className="mt-auto pb-1 space-y-1 absolute bottom-0 left-0 right-0 bg-linear-to-t from-background to-transparent px-2">
        {showToBottom && (
          <ViewTransition>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full shadow-xl absolute left-1/2 -translate-x-1/2 -top-10 z-10"
              onClick={() => scrollToBottom("smooth")}
            >
              <ChevronDown />
            </Button>
          </ViewTransition>
        )}

        <ViewTransition name="chat-input">
          <ChatInput
            models={models.filter((i) => i.type === "Text Generation")}
            className="mx-auto max-w-3xl bg-background shadow-xl"
            onSendMessage={onSendMessage}
            status={status}
            onStop={stop}
            onRetry={regenerate}
          />
        </ViewTransition>
        <Footer />
      </div>

      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
    </div>
  );
};

export default Page;
