
import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Mic, CheckCircle2, Loader2 } from 'lucide-react';
import { EveningEntry, Personality } from '../types';
import { generateChatReply, extractLogFromChat } from '../services/geminiService';

interface InterrogationRoomProps {
    onComplete: (entry: EveningEntry) => void;
    personality: Personality;
}

interface Message {
    role: 'agent' | 'user';
    text: string;
}


// Mock AI chat logic removed

export const InterrogationRoom: React.FC<InterrogationRoomProps> = ({ onComplete, personality }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Initial greeting based on personality
        const greeting = personality === 'jinnai'
            ? "お、来たな。今日はどんな一日だったんだ？適当に喋りな。"
            : "静かな夜ですね。あなたの今日の物語を、少しずつ聞かせていただけますか？";

        setMessages([{ role: 'agent', text: greeting }]);
    }, [personality]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        try {
            const history = [...messages, { role: 'user', text: userMsg }];
            const reply = await generateChatReply(history, personality);

            setMessages(prev => [...prev, { role: 'agent', text: reply }]);
        } catch (e: any) {
            console.error(e);
            let errorMsg = `（...エラーが発生したようだ: ${e.message}）`;
            if (e.message?.includes("環境変数")) {
                errorMsg = "（...Netlifyの環境変数が設定されていないようだ。設定を確認してくれ）";
            } else if (e.message?.includes("混み合って")) {
                errorMsg = "（...今、Gemini 3がめちゃくちゃ混んでるみたいだぜ。少し時間を置いてみてくれ）";
            }
            setMessages(prev => [...prev, { role: 'agent', text: errorMsg }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleFinish = async () => {
        if (messages.length < 3) {
            alert("もう少し話そうぜ。まだ何も分かってねえよ。");
            return;
        }

        setIsExtracting(true);
        try {
            const entry = await extractLogFromChat(messages);
            if (entry) {
                onComplete(entry);
            } else {
                throw new Error("Extraction failed");
            }
        } catch (e) {
            alert("記録の生成に失敗した。すまん、もう一度やり直してくれ。");
            setIsExtracting(false);
        }
    };

    return (
        <div className="flex flex-col h-[65vh] md:h-[80vh] bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden text-slate-100 shadow-2xl border border-slate-700 animate-in zoom-in-95 duration-500">
            <div className="p-4 md:p-6 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-500 flex items-center justify-center font-black text-xs md:text-sm">
                        {personality === 'jinnai' ? "陣" : "AI"}
                    </div>
                    <div>
                        <h3 className="font-bold text-sm md:text-base">{personality === 'jinnai' ? "取調室" : "対話の間"}</h3>
                        <p className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-widest">Recording...</p>
                    </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-2xl text-[13px] md:text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-500/10'
                            : 'bg-slate-700 text-slate-200 rounded-bl-none shadow-lg shadow-slate-950/20'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-slate-700 p-3 md:p-4 rounded-2xl rounded-bl-none flex gap-1">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100" />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 md:p-4 bg-slate-800 border-t border-slate-700">
                <div className="flex items-center gap-2 md:gap-3 bg-slate-900 p-1 md:p-2 rounded-full border border-slate-600 focus-within:border-indigo-500 transition-colors">
                    <button className="p-2 md:p-3 text-slate-400 hover:text-indigo-400 transition-colors hidden xs:block">
                        <Mic size={18} />
                    </button>
                    <input
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-slate-200 placeholder:text-slate-600 font-medium text-sm px-3"
                        placeholder="供述を書き込む..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <div className="flex items-center gap-1 md:gap-2">
                        <button
                            onClick={handleFinish}
                            disabled={isExtracting || isTyping}
                            className="p-2 md:p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-400 disabled:opacity-50 transition-all flex items-center gap-2 px-3 md:px-4 shadow-lg shadow-emerald-500/20"
                            title="会話を終了して記録する"
                        >
                            {isExtracting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            <span className="text-[10px] md:text-xs font-bold hidden sm:block">終了</span>
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping || isExtracting}
                            className="p-2 md:p-3 bg-indigo-500 text-white rounded-full hover:bg-indigo-400 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
