/*
  ai-frameworks: LangChain, LangGraph, CrewAI, OpenAI Agents SDK, Claude Agent SDK, Google ADK,
  Microsoft Agent Framework (AutoGen successor), LlamaIndex, and the no-framework option.
  Versions read from PyPI + official docs on 4 Oct 2026 (see versions table).
  Widgets verified with scratchpad/aip/t2.js (code tab line counts, needs -> recommendation cases).
*/
Lesson.register({
  id: 'ai-frameworks',
  title: 'LangChain, LangGraph, CrewAI aur baaki',
  minutes: 42,
  summary: `Agent loop haath se likhna seekh liya. Ab frameworks: LangChain, LangGraph, CrewAI, OpenAI Agents SDK, Claude Agent SDK, Google ADK, Microsoft Agent Framework aur LlamaIndex. Har ek ke core concepts, chhota code, kab use karein, kab nahi, aur "koi framework nahi" wala option bhi.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Agent banane mein har baar kuch kaam same hote hain: model ko call karna, tool chalana, baat-cheet yaad rakhna, crash ke baad wahin se chalu karna, insaan ke "haan" ka wait karna.<br>Ye sab har team baar baar khud likhe, to time bhi jaata hai aur bugs bhi aate hain. <strong>Framework</strong> ye common kaam ready deta hai, jaise website banane ke liye ready-made toolkit.<br>Is lesson mein 8 popular frameworks ko ek hi kaam (xyz.com ka order status batana) se samjhoge: har ek ka mental model, chhota code, kab use karna aur kab nahi. Aur ek seedha sawaal bhi: kya framework chahiye bhi?` },
    { type: 'h2', text: 'Problem: har baar loop dobara kyun likhein?' },
    { type: 'p', html: `<a href="#/ai-harness">Harness lesson</a> mein xyz Assistant ka loop humne khud likha: model ko call karo, tool call aaye to chalao, result wapas do, max turns pe roko. <a href="#/ai-agent-patterns">Patterns lesson</a> mein multi-agent, human approval, guardrails aur tracing bhi chahiye the.` },
    { type: 'p', html: `Ab xyz.com ki teen teams teen alag cheezein bana rahi hain: support agent, help-docs search (<a href="#/ai-rag">RAG</a>), aur ek internal coding agent. Har team same plumbing dobara likh rahi hai: tool schema banana, history sambhalna, crash ke baad resume, approval pe rukna, traces. Yahi kaam <strong>frameworks</strong> karte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Agent framework', html: `<strong>Ye kya hai:</strong> ek library (pehle se likha hua code) jo agent banane ke common hisse ready deti hai: model ko call karne ka ek standard tareeka (kisi bhi provider ke liye), Python function se tool schema banana, agent loop, state/memory, crash ke baad resume (checkpoint), human-in-the-loop, multi-agent, aur tracing. Tum sirf apna logic (prompts, tools, flow) likhte ho.<br><strong>Kyun chahiye:</strong> ye plumbing har project mein same hai. Ek baar achhe se bana hua, test kiya hua version sabke kaam aata hai.<br><strong>Iske bina:</strong> har team 200-500 line ka same plumbing khud likhti hai, apne alag bugs ke saath.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Abstraction', html: `<strong>Ye kya hai:</strong> mushkil cheez ke upar ek aasaan "button". Tum <code>agent.invoke("...")</code> likhte ho; andar framework 10 kaam karta hai (prompt banana, API call, tool chalana...). Jaise car ka steering: tumhe engine ke andar nahi jaana padta.<br><strong>Kyun chahiye:</strong> kam code, jaldi kaam.<br><strong>Iske bina:</strong> har detail khud sambhalni padti.<br><strong>Dhyaan:</strong> abstraction ke peeche asli prompt aur API calls chhup jaate hain. Kuch galat ho to "andar kya hua" dekhna mushkil hota hai. Ye har framework ki chhupi keemat hai.` },
    { type: 'table', head: ['Framework kya deta hai', 'Bina framework ke tum kya likhte', 'Lesson link'], rows: [
      ['Model abstraction', 'Har provider ka alag API format', '<a href="#/ai-what-is-llm">LLM</a>'],
      ['Tool schema from function', 'JSON schema haath se', '<a href="#/ai-agents">Agents</a>'],
      ['Agent loop + stop conditions', 'while loop, stop_reason check, max turns', '<a href="#/ai-harness">Harness</a>'],
      ['State, memory, checkpoints', 'DB mein history save/load, resume logic', '<a href="#/ai-context">Context</a>'],
      ['Human-in-the-loop', 'Pause, state save, approval aane pe resume', '<a href="#/ai-agent-patterns">Patterns</a>'],
      ['Multi-agent (handoff, crew, graph)', 'Agents ke beech routing aur message passing', '<a href="#/ai-agent-patterns">Patterns</a>'],
      ['Tracing', 'Har call ka log, spans, dashboard', '<a href="#/ai-agent-patterns">Patterns</a>'],
    ] },
    { type: 'callout', tone: 'warn', title: 'Frameworks bahut tezi se badalte hain', html: `Ye lesson <strong>4 October 2026</strong> ko official docs aur PyPI padh ke likha gaya. Neeche ke versions tab ke hain. Code sketches samjhane ke liye chhote rakhe hain (error handling, API keys, imports kuch jagah chhode); production mein hamesha us din ke official docs dekho. Model names (jaise <code>claude-sonnet-4-6</code>, <code>gemini-flash-latest</code>) sirf examples hain.` },
    { type: 'table', caption: 'Latest Python package versions, PyPI (Python packages ki official public library, jahan se pip install hota hai) par 4 Oct 2026 ko dekhe gaye. 0.x version ka matlab: maker ne API ko abhi stable nahi maana, badal sakti hai.', head: ['Framework', 'Package', 'Version', 'Maker'], rows: [
      ['LangChain', '<code>langchain</code>', '1.4.3', 'LangChain Inc.'],
      ['LangGraph', '<code>langgraph</code>', '1.2.12', 'LangChain Inc.'],
      ['CrewAI', '<code>crewai</code>', '1.15.23', 'CrewAI Inc.'],
      ['OpenAI Agents SDK', '<code>openai-agents</code>', '0.23.1', 'OpenAI'],
      ['Claude Agent SDK', '<code>claude-agent-sdk</code>', '0.2.163', 'Anthropic'],
      ['Google ADK', '<code>google-adk</code>', '2.11.0', 'Google'],
      ['Microsoft Agent Framework', '<code>agent-framework</code>', '1.20.0', 'Microsoft'],
      ['LlamaIndex', '<code>llama-index-core</code>', '0.14.25', 'LlamaIndex Inc.'],
      ['AutoGen (maintenance mode)', '<code>autogen-agentchat</code>', '0.7.5 (Sep 2025)', 'Microsoft'],
    ] },

    { type: 'h2', text: 'Option 0: koi framework nahi' },
    { type: 'callout', tone: 'term', title: 'Naya word: SDK', html: `<strong>Ye kya hai:</strong> Software Development Kit. Kisi company ki di hui chhoti library jisse uski service code se use karna aasaan ho. Jaise <code>anthropic</code> ya <code>openai</code> Python package: tum <code>client.messages.create(...)</code> likhte ho, wo HTTP request bana ke bhej deta hai.<br><strong>Kyun chahiye:</strong> raw HTTP, headers, retries khud nahi likhne padte.<br><strong>Iske bina:</strong> har API call ke liye JSON aur HTTP haath se.<br><strong>Farak yaad rakho:</strong> provider SDK sirf "model ko call karo" deta hai. Agent framework uske upar loop, state, multi-agent jaisi cheezein deta hai.` },
    { type: 'p', html: `Pehle baseline. Model provider ka seedha SDK + 20 line ka loop. Anthropic ka "Building effective agents" (Dec 2024) yahi salah deta hai: pehle LLM API seedha use karo; framework lo to samjho ki andar kya ho raha hai, kyunki abstraction ke peeche asli prompt aur response chhup jaate hain aur debugging mushkil hoti hai.` },
    { type: 'code', text: `# No framework: Anthropic Python SDK + apna loop
import anthropic
client = anthropic.Anthropic()

tools = [{
    "name": "get_order_status",
    "description": "xyz.com order ka current status do",
    "input_schema": {"type": "object",
                     "properties": {"order_id": {"type": "string"}},
                     "required": ["order_id"]},
}]
messages = [{"role": "user", "content": "Order 881 kahan hai?"}]

for turn in range(5):                                  # max turns
    resp = client.messages.create(model="claude-sonnet-4-6", max_tokens=1024,
                                  tools=tools, messages=messages)
    messages.append({"role": "assistant", "content": resp.content})
    if resp.stop_reason != "tool_use":                 # model ne kaam khatam kiya
        break
    results = [{"type": "tool_result", "tool_use_id": b.id,
                "content": get_order_status(**b.input)}   # TUMHARA code tool chalata hai
               for b in resp.content if b.type == "tool_use"]
    messages.append({"role": "user", "content": results})

print(resp.content[-1].text)` },
    { type: 'p', html: `<strong>Kab sahi:</strong> ek agent, kuch tools, simple flow; tumhe har byte pe control chahiye; dependencies kam rakhni hain. <strong>Kab dikkat:</strong> jab crash-resume, approvals ka wait, multi-agent, streaming UI aur tracing sab chahiye; tab tum dheere dheere apna khud ka framework bana rahe hote ho.` },

    { type: 'h2', text: 'LangChain: building blocks + ready agent' },
    { type: 'p', html: `LangChain sabse purana aur bada ecosystem hai (2022 se). October 2025 mein <strong>LangChain 1.0</strong> aaya aur focus badla: ab main cheez <code>create_agent</code> hai, aur purane "chains" jaise legacy hisse <code>langchain-classic</code> package mein chale gaye. Building blocks (messages, prompts, runnables, tools) <code>langchain-core</code> mein hain. LangChain ke agents andar se LangGraph pe chalte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Chain', html: `<strong>Ye kya hai:</strong> kuch steps ko ek fixed line mein jodna, jahan ek ka output agle ka input ho: prompt banao → model ko bhejo → jawab saaf karo. LangChain ka naam yahin se aaya. Ye wahi <a href="#/ai-agent-patterns">prompt chaining</a> wala idea hai, code mein.<br><strong>Kyun chahiye:</strong> har baar "template bharo, API call karo, text nikaalo" ka same code na likhna pade.<br><strong>Iske bina:</strong> har jagah copy-paste glue code.<br><strong>Dhyaan:</strong> chain mein model raasta nahi chunta (ye workflow hai, agent nahi).` },
    { type: 'h3', text: 'Core concepts' },
    { type: 'list', items: [
      `<strong>Chat models</strong>: <code>init_chat_model("anthropic:claude-sonnet-4-6")</code> jaisa ek interface, provider badlo to baaki code same. <code>.invoke()</code>, <code>.stream()</code>, <code>.batch()</code>, <code>.bind_tools()</code>, <code>.with_structured_output()</code>.`,
      `<strong>Messages</strong>: SystemMessage, HumanMessage, AIMessage, ToolMessage. v1 mein <code>content_blocks</code> se har provider ka reasoning/citations ek format mein.`,
      `<strong>Prompt templates</strong>: <code>ChatPromptTemplate</code> mein <code>{variable}</code> wale placeholders, taaki prompt code se alag rahe.`,
      `<strong>Runnables aur LCEL</strong>: har component (prompt, model, parser, retriever) ek <em>Runnable</em> hai jiske paas same methods hain: invoke, stream, batch, aur async versions. <strong>LCEL</strong> (LangChain Expression Language) mein inhe <code>|</code> pipe se jodte ho: ek ka output agle ka input. <code>RunnableParallel</code> se ek input pe kai cheezein saath.`,
      `<strong>Tools</strong>: <code>@tool</code> decorator; function ka naam, type hints aur docstring se schema ban jaata hai.`,
      `<strong>Retrievers</strong>: "query do, relevant documents lo" ka interface. Vector store se <code>vector_store.as_retriever(search_kwargs={"k": 4})</code>. RAG ka retrieval step yahi hai.`,
      `<strong>Agents</strong>: <code>create_agent(model, tools, system_prompt)</code> ready-made tool-calling loop deta hai.`,
      `<strong>Middleware</strong> (v1 ka naya concept): loop ke points pe hooks, yaani apna code jodne ki jagah. Built-in examples: <code>HumanInTheLoopMiddleware</code> (sensitive tool pe approval), <code>SummarizationMiddleware</code> (lambi history compact), <code>PIIMiddleware</code> (model ko bhejne se pehle PII redact).`,
    ] },
    { type: 'callout', tone: 'term', title: 'Naya word: Middleware', html: `<strong>Ye kya hai:</strong> agent loop ke beech mein lagne wala chhota code jo har model call ya tool call se pehle/baad chalta hai. Jaise airport pe security check: har yaatri (har call) usse guzarta hai.<br><strong>Kyun chahiye:</strong> approval, PII hatana, lambi history chhoti karna jaise kaam har agent mein chahiye; middleware se ek line mein jud jaate hain.<br><strong>Iske bina:</strong> ye checks agent ke loop ke andar haath se ghusaane padte.<br><strong>Example:</strong> neeche <code>HumanInTheLoopMiddleware</code>: <code>refund</code> call pe agent ruk jaata hai, <code>get_order_status</code> pe nahi.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Runnable aur LCEL', html: `<strong>Ye kya hai:</strong> <strong>Runnable</strong> = LangChain ka common "plug": jo bhi cheez <code>.invoke(input)</code> se chal sake (prompt, model, parser, retriever). <strong>LCEL</strong> = inhe <code>|</code> (pipe) se jodne ka tareeka. Jaise Lego ke saare blocks ka neeche same shape ka khaancha: koi bhi block kisi bhi block pe lag jaata hai.<br><strong>Kyun chahiye:</strong> sab same shape ke hain, isliye jodna aasaan, aur <code>.stream()</code>, <code>.batch()</code>, async sabko free mein milte hain.<br><strong>Iske bina:</strong> har component ka alag method naam, alag streaming code.` },
    { type: 'p', html: `<strong>Chhota worked example</strong> (neeche wala chain): input <code>{"doc": "Password reset: Settings > Security...", "question": "Password kaise badlun?"}</code> → <strong>prompt</strong> 2 messages banata hai (system + human, doc aur sawaal bhar ke) → <strong>model</strong> ek AIMessage lautata hai → <strong>StrOutputParser</strong> usme se sirf text nikaalta hai: <code>"Settings > Security mein jaake Reset dabao..."</code>. Teen Runnables, ek pipe, ek string output.` },
    { type: 'code', text: `# LCEL: prompt | model | parser  (ek simple chain, agent nahi)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.chat_models import init_chat_model

prompt = ChatPromptTemplate.from_messages([
    ("system", "Tum xyz.com ke support assistant ho. 2 line mein jawab do."),
    ("human", "Help doc:\\n{doc}\\n\\nSawaal: {question}"),
])
model = init_chat_model("anthropic:claude-sonnet-4-6")
chain = prompt | model | StrOutputParser()

chain.invoke({"doc": "Password reset: Settings > Security...", "question": "Password kaise badlun?"})
# chain.stream(...) aur chain.batch([...]) bhi bina extra code ke` },
    { type: 'code', text: `# LangChain agent: create_agent + tool + human approval middleware
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain.tools import tool
from langgraph.checkpoint.memory import InMemorySaver

@tool
def refund(order_id: str, amount: int) -> str:
    """Order ka refund initiate karo (rupees mein amount)."""
    return payments.refund(order_id, amount)

agent = create_agent(
    model="claude-sonnet-4-6",
    tools=[get_order_status, refund],
    system_prompt="Tum xyz.com ke support assistant ho.",
    middleware=[HumanInTheLoopMiddleware(interrupt_on={"refund": True,
                                                      "get_order_status": False})],
    checkpointer=InMemorySaver(),     # pause/resume ke liye state save karna zaroori
)
# refund call pe agent rukta hai; insaan ke decision ke baad:
# agent.invoke(Command(resume={"decisions": [{"type": "approve"}]}), config=config)` },
    { type: 'p', html: `<strong>Kab LangChain:</strong> tumhe jaldi ek standard tool-calling agent chahiye, kai model providers ke beech switch karna hai, aur bada integrations ecosystem (vector stores, loaders) chahiye. <strong>Kab nahi:</strong> chhoti si cheez ke liye poori dependency tree; ya jab flow bahut custom ho (tab seedha LangGraph).` },

    { type: 'h2', text: 'LangGraph: agent as a graph (state machine)' },
    { type: 'p', html: `LangGraph LangChain team ka <strong>low-level</strong> framework hai (1.0 bhi October 2025 mein). Idea: apne agent ko ek <strong>graph</strong> ki tarah likho: boxes (nodes) jo kaam karte hain, arrows (edges) jo batate hain aage kahan jaana hai, aur ek shared <strong>state</strong> jo sab nodes padhte/likhte hain. Loop, branching, parallel kaam, sab explicit.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Graph (state machine)', html: `<strong>Ye kya hai:</strong> ek naksha jisme boxes (kaam) aur arrows (aage kahan jaana hai) hain. <strong>State machine</strong> = system jo ek haalat (state) se doosri mein fixed rules se jaata hai. Jaise metro map: stations aur unke beech ki lines; train sirf lines pe hi chal sakti hai.<br><strong>Kyun chahiye:</strong> agent ka raasta (loop, branch, approval ka wait) code mein saaf dikhta hai, aur framework har station pe ruk ke save kar sakta hai.<br><strong>Iske bina:</strong> sab kuch ek bade while loop aur if-else mein chhupa; kahan rukna, kahan se resume, samajhna mushkil.` },
    { type: 'callout', tone: 'term', title: 'Naye words: State, Node, Edge', html: `<strong>State</strong> (Ye kya hai): ek shared dict jise sab nodes padhte aur update karte hain, jaise class ka common whiteboard. Example: <code>{"messages": [...], "order_id": "881"}</code>. Iske bina har function ko saari jaankari alag se pass karni padti.<br><strong>Node</strong> (Ye kya hai): ek normal Python function: state lo, chhota update lautao. LLM call, tool run, ya simple code, sab node. Iske bina kaam ke tukde alag nahi dikhte.<br><strong>Edge</strong> (Ye kya hai): arrow jo batata hai node ke baad kaunsa node. Fixed edge hamesha same jagah; <strong>conditional edge</strong> ek function chalata hai jo state dekh ke raasta chunta hai. Iske bina "aage kya" har node ke andar chhupa hota.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Reducer', html: `<strong>Ye kya hai:</strong> rule jo batata hai ki node ka update purani state mein <em>kaise</em> mile: purana value badal do (replace), ya list mein jod do (append).<br><strong>Kyun chahiye:</strong> do nodes ek hi key update karein (jaise dono messages jodein) to kuch khona nahi chahiye.<br><strong>Iske bina:</strong> doosra update pehle wale ko mita deta.<br><strong>Worked example:</strong> state <code>messages = [m1, m2]</code>. Node lautata hai <code>{"messages": [m3]}</code>. Default (replace) reducer ke saath: <code>[m3]</code> (history gayi!). <code>add_messages</code> reducer ke saath: <code>[m1, m2, m3]</code>. Isiliye messages wali key pe hamesha append wala reducer.` },
    { type: 'list', items: [
      `<strong>State</strong>: <code>TypedDict</code> ya Pydantic model. Har key ka ek <strong>reducer</strong> ho sakta hai jo batata hai update kaise merge ho: default replace; <code>Annotated[list, operator.add]</code> se append; <code>add_messages</code> messages ke liye (id se dedupe bhi). Ready-made <code>MessagesState</code>.`,
      `<strong>Nodes</strong>: normal functions. LLM call, tool run, ya simple code; sab node.`,
      `<strong>Edges</strong>: <code>add_edge("a", "b")</code> fixed; <code>add_conditional_edges("a", router_fn)</code> jahan function state dekh ke agla node chunta hai. <code>START</code> aur <code>END</code> special nodes.`,
      `<strong>Compile</strong>: <code>graph.compile(checkpointer=...)</code> se runnable app banta hai (invoke, stream).`,
      `<strong>Checkpointer + thread_id</strong>: har step ke baad state save. Same <code>thread_id</code> se baat aage badhti hai (memory), crash ke baad wahin se resume (<strong>durable execution</strong>), aur purane checkpoint pe "time travel" debugging.`,
      `<strong>interrupt() + Command(resume=...)</strong>: node ke andar <code>interrupt(payload)</code> graph ko rok deta hai; result mein <code>__interrupt__</code> aata hai; baad mein <code>Command(resume=value)</code> se wahin se chalta hai. Ye human-in-the-loop hai.`,
      `<strong>Send</strong>: runtime pe N parallel tasks (map-reduce, orchestrator-workers). <strong>Command(goto=..., update=...)</strong>: node khud state update + agla node bata sakta hai (handoffs ke liye).`,
      `<strong>Streaming</strong>: har node ka update ya LLM tokens live UI tak.`,
    ] },
    { type: 'callout', tone: 'term', title: 'Naye words: Checkpointer aur thread_id', html: `<strong>Ye kya hai:</strong> <strong>checkpointer</strong> wo hissa jo graph ke har <strong>super-step</strong> (ek round jisme ek ya kai nodes chale) ke baad poori state ki copy save karta hai: memory mein (<code>InMemorySaver</code>, sirf testing ke liye) ya database mein (Postgres/SQLite). <strong>thread_id</strong> = ek baat-cheet ka naam (jaise <code>"user-42"</code>), jisse pata chale kaunsi saved state kiski hai.<br><strong>Kyun chahiye:</strong> (1) same thread_id pe agla message aaye to purani baat yaad (memory), (2) crash ke baad wahin se chalu (isko <strong>durable execution</strong> kehte hain), (3) purane checkpoint pe wapas jaake debug (time travel), (4) approval ka wait.<br><strong>Iske bina:</strong> process band = sab bhool gaya.<br><strong>Example:</strong> neeche ke flow ke happy path mein 3 super-steps (agent → tools → agent) = 3 checkpoints, sab <code>thread_id="user-42"</code> ke neeche.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Interrupt', html: `<strong>Ye kya hai:</strong> node ke andar <code>interrupt(payload)</code> likhne se graph wahin <em>ruk</em> jaata hai, state checkpoint mein save hoti hai, aur app ko <code>__interrupt__</code> mein payload milta hai (jaise "refund ₹4,500 approve karein?"). Baad mein <code>Command(resume=value)</code> bhejo to graph wahin se chalta hai, aur <code>interrupt()</code> wahi value lautata hai.<br><strong>Kyun chahiye:</strong> <a href="#/ai-agent-patterns">human-in-the-loop</a> ke liye, bina process ko ghanton jagaaye rakhe.<br><strong>Iske bina:</strong> approval ke liye <code>time.sleep()</code> ya polling, aur restart pe sab gayab.<br><strong>Dhyaan:</strong> resume pe wo node <em>shuru se</em> dobara chalta hai (interrupt wali line pe ab value mil jaati hai). Isliye interrupt se pehle koi side-effect (paisa bhejna, email) mat rakho.` },
    { type: 'code', text: `# LangGraph: model node + tools node + approval node, checkpointer ke saath
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import interrupt, Command
from langchain.chat_models import init_chat_model

model = init_chat_model("anthropic:claude-sonnet-4-6").bind_tools([get_order_status, refund])

def agent(state: MessagesState):
    return {"messages": [model.invoke(state["messages"])]}

def route(state: MessagesState):
    calls = state["messages"][-1].tool_calls
    if not calls:
        return END
    return "approve" if calls[0]["name"] == "refund" else "tools"

def approve(state: MessagesState):
    ok = interrupt({"action": state["messages"][-1].tool_calls[0]})   # yahan graph rukta hai
    return Command(goto="tools" if ok else "agent")   # (sketch: reject pe asli code ToolMessage bhi jodta)

g = StateGraph(MessagesState)
g.add_node("agent", agent)
g.add_node("tools", ToolNode([get_order_status, refund]))
g.add_node("approve", approve)
g.add_edge(START, "agent")
g.add_conditional_edges("agent", route, ["tools", "approve", END])
g.add_edge("tools", "agent")
app = g.compile(checkpointer=InMemorySaver())   # production: Postgres/SQLite checkpointer

cfg = {"configurable": {"thread_id": "user-42"}}
app.invoke({"messages": [("user", "Order 881 ka refund karo")]}, cfg)   # -> __interrupt__
app.invoke(Command(resume=True), cfg)                                   # approve ke baad aage` },
    { type: 'flow', height: 330, title: 'LangGraph: loop, interrupt aur checkpoint',
      nodes: [
        { id: 'u', label: 'User / app', x: 75, y: 165, w: 120, kind: 'client', info: 'Ye kya hai: tumhara app (xyz.com ka backend) jo graph ko invoke karta hai, thread_id ke saath. Interrupt aane pe ye approval UI dikhata hai.' },
        { id: 'ag', label: 'agent node', sub: 'LLM call', x: 265, y: 165, w: 140, kind: 'server', info: 'Ye kya hai: graph ka wo node jo model ko messages bhejta hai. Model ya to final answer deta hai ya tool call. Conditional edge (route function) decide karta hai agla node.' },
        { id: 'tl', label: 'tools node', sub: 'ToolNode', x: 475, y: 65, w: 150, kind: 'server', info: 'Ye kya hai: LangGraph ka ready-made ToolNode. last AI message ke tool_calls chalata hai aur ToolMessage results state mein jodta hai. Phir fixed edge wapas agent node pe: yahi agent loop hai.' },
        { id: 'ap', label: 'approve node', sub: 'interrupt()', x: 475, y: 265, w: 150, kind: 'edge', info: 'Ye kya hai: risky tool (refund) se pehle ka approval node. interrupt() graph ko pause karta hai; state checkpoint mein safe; jab app Command(resume=...) bheje tab wahin se chalta hai.' },
        { id: 'ck', label: 'Checkpointer', sub: 'per thread_id', x: 645, y: 165, w: 130, kind: 'data', info: 'Ye kya hai: state ki tijori. Har super-step ke baad poori state save hoti hai (InMemorySaver dev ke liye; Postgres/SQLite production ke liye). Isi se memory, resume, time-travel aur human-in-the-loop possible hain.' },
      ],
      edges: [{ a: 'u', b: 'ag' }, { a: 'ag', b: 'tl' }, { a: 'ag', b: 'ap' }, { a: 'ap', b: 'tl' }, { a: 'ag', b: 'ck', dashed: true }],
      scenarios: [
        { name: 'Happy path loop', steps: [
          { title: 'invoke', text: 'App graph ko user message aur <code>thread_id</code> ke saath chalata hai. START se agent node.', go: 'u>ag', msg: 'app.invoke({"messages": [...]}, {"configurable": {"thread_id": "user-42"}})' },
          { title: 'Tool call → tools node', text: 'Model ne <code>get_order_status</code> maanga. route() ne "tools" lautaya.', go: 'ag>tl', set: { ap: { state: 'dim' } } },
          { title: 'Wapas agent', text: 'Tool result state mein jud gaya, fixed edge wapas agent pe. Har step ke baad checkpoint.', go: ['res:tl>ag', 'evt:ag>ck'], after: { ck: { sub: '3 checkpoints' } } },
          { title: 'END', text: 'Ab model ne final answer diya, tool_calls khaali, route() ne END lautaya.', go: 'res:ag>u', msg: 'Aapka order #881 kal deliver hoga.' },
        ]},
        { name: 'Interrupt + resume', steps: [
          { title: 'Refund maanga', text: 'Model ne <code>refund(881, 4500)</code> maanga. route() ne "approve" chuna.', go: 'u>ag>ap', set: { tl: { state: 'dim' } } },
          { title: 'interrupt()', text: 'Graph ruk gaya. State checkpoint mein; app ko <code>__interrupt__</code> payload mila. Process band bhi ho jaaye to koi baat nahi.', go: ['evt:ag>ck', 'res:ap>ag>u'], after: { ap: { state: 'warn', sub: 'PAUSED' } }, msg: '__interrupt__: {"action": {"name": "refund", "args": {...}}}' },
          { title: 'Ghante baad: resume', text: 'Support staff ne approve kiya. App same thread_id ke saath <code>Command(resume=True)</code> bhejta hai; graph checkpoint se state load karke approve node se aage chalta hai.', go: ['u>ag', 'ag>ap', 'ap>tl'], set: { tl: { state: '' } }, after: { ap: { state: 'ok', sub: 'approved' }, tl: { state: 'ok', sub: 'refunded' } }, msg: 'app.invoke(Command(resume=True), cfg)' },
          { title: 'Final reply', text: 'Tools ke baad agent confirm karta hai aur END.', go: ['res:tl>ag', 'res:ag>u'] },
        ]},
        { name: 'Crash ke baad resume', steps: [
          { title: 'Beech mein crash', text: 'Tool step ke baad server restart ho gaya (naya deploy, ya OOM yaani memory khatam).', go: 'u>ag>tl', after: { ag: { state: 'down', sub: 'process died' } } },
          { title: 'Bina checkpointer?', text: 'Saara kaam gaya; user ko dobara se poochhna padega, aur tool (jaise refund) dobara chal sakta hai: double refund!', focus: ['tl'], set: { tl: { state: 'warn', sub: 'repeat risk' } } },
          { title: 'Checkpointer ke saath', text: 'Naya process same thread_id se invoke karta hai; last checkpoint (tool result ke saath) load hota hai aur kaam wahin se. Side-effect wale tools ko phir bhi <strong>idempotent</strong> banao: dobara chalne pe bhi asar ek hi baar ho (jaise refund ke saath ek idempotency key bhejo; same key doosri baar aaye to payments system use ignore kare), kyunki crash tool ke beech mein bhi ho sakta hai.', go: ['res:ck>ag', 'res:ag>u'], set: { ag: { state: 'ok', sub: 'resumed' }, tl: { state: '' } } },
        ]},
      ],
    },
    { type: 'p', html: `<strong>Kab LangGraph:</strong> custom control flow (branches, loops, parallel), long-running ya durable agents, human approval jo ghanton baad aaye, multi-agent graphs. <strong>Kab nahi:</strong> simple chatbot ya ek tool wala agent: graph ka boilerplate faltu lagega; wahan <code>create_agent</code> (jo andar LangGraph hi hai) ya no-framework.` },

    { type: 'h2', text: 'CrewAI: agents ki team, roles ke saath' },
    { type: 'p', html: `CrewAI ka mental model ek <strong>team</strong> hai: har agent ka ek role, goal aur backstory; kaam <strong>tasks</strong> mein; team <strong>crew</strong>; aur kaam kis order mein ho wo <strong>process</strong>. Iske upar <strong>Flows</strong>: event-driven, state wala workflow layer. CrewAI docs khud kehte hain ki production app ke liye Flow se shuru karo aur jahan autonomy chahiye wahan Flow ke step mein Crew chalao. Ye LangChain pe based nahi, standalone hai.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Agent, Task, Crew (CrewAI mein)', html: `<strong>Agent</strong> (Ye kya hai): ek "team member" jiska <code>role</code> (kaun hai), <code>goal</code> (kya chahta hai) aur <code>backstory</code> (thoda background) likha hota hai, aur kuch tools. CrewAI in teeno se us agent ka prompt khud banata hai.<br><strong>Task</strong> (Ye kya hai): ek kaam ka card: <code>description</code> (kya karna hai) + <code>expected_output</code> (result kaisa dikhe) + kaunsa agent karega.<br><strong>Crew</strong> (Ye kya hai): agents + tasks ki team, jo <code>kickoff()</code> se kaam shuru karti hai.<br><strong>Kyun chahiye:</strong> "researcher, writer, reviewer" jaise roles mein kaam sochna insaanon ke liye natural hai; prompt likhne ki jagah role bharo.<br><strong>Iske bina:</strong> har agent ka lamba system prompt aur unke beech output pass karne ka code khud likhna.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Process (sequential vs hierarchical)', html: `<strong>Ye kya hai:</strong> crew ke tasks kis order mein aur kaun baantega, iska rule. <strong>Sequential</strong>: tasks list ke order mein, ek ka output agle ka context. <strong>Hierarchical</strong>: ek manager agent (jise <code>manager_llm</code> ya <code>manager_agent</code> dena padta hai) tay karta hai kaunsa task kisko, output review karta hai, zarurat ho to wapas bhejta hai.<br><strong>Kyun chahiye:</strong> kuch kaam fixed order mein theek hain, kuch mein "boss" ka judgment chahiye.<br><strong>Iske bina:</strong> order aur delegation ka logic khud likhna padta.<br><strong>Worked example (andaaza):</strong> 2 tasks (research, reply). Sequential: Researcher ka kaam, phir Writer ka; koi extra call nahi. Hierarchical: upar se manager ki calls bhi: plan, 2 reviews, final jawab = is chhote example mein lagbhag 4 extra LLM calls. Flexibility milti hai, lekin bill aur time badhta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Flow (CrewAI Flows)', html: `<strong>Ye kya hai:</strong> ek Python class jisme methods pe decorators lagte hain: <code>@start()</code> (shuru), <code>@listen(x)</code> (x khatam hone pe chalo), <code>@router(x)</code> (string lauta ke raasta chuno). Ek typed <code>state</code> sab methods share karte hain. Jaise ek fixed workflow (code decide karta hai), jiske kisi step mein crew (agents) chala sakte ho.<br><strong>Kyun chahiye:</strong> production mein zyaadatar raasta predictable chahiye; autonomy sirf wahan jahan zaroori.<br><strong>Iske bina:</strong> har sawaal pe poori crew chalti, chahe sawaal "password kaise badlun" jitna simple ho.` },
    { type: 'h3', text: 'Core concepts' },
    { type: 'list', items: [
      `<strong>Agent</strong>: <code>role</code> (kaun hai), <code>goal</code> (kya chahta hai), <code>backstory</code> (context/personality), <code>tools</code>, <code>llm</code>. Optional: <code>allow_delegation</code>, <code>max_iter</code> (loop limit), memory, knowledge.`,
      `<strong>Task</strong>: <code>description</code> (kya karna hai, <code>{placeholders}</code> ke saath), <code>expected_output</code> (output kaisa dikhe), <code>agent</code>, <code>context</code> (kin pichhle tasks ka output chahiye), optional <code>output_pydantic</code>/<code>output_json</code>, <code>guardrail</code>, <code>human_input</code>.`,
      `<strong>Crew</strong>: agents + tasks + process. <code>crew.kickoff(inputs={...})</code> se chalta hai. Options: <code>memory</code>, <code>planning</code> (pehle ek planner step-by-step plan banata hai), <code>verbose</code>.`,
      `<strong>Process</strong>: <code>Process.sequential</code> (tasks list ke order mein, pichhle ka output agle ka context) ya <code>Process.hierarchical</code> (ek manager, <code>manager_llm</code> ya <code>manager_agent</code> se, tasks baant ta hai, output review karta hai).`,
      `<strong>Tools</strong>: <code>@tool</code> decorator (<code>crewai.tools</code>) ya <code>BaseTool</code> class; <code>crewai_tools</code> package mein ready tools (search, scrape, files...). MCP servers bhi.`,
      `<strong>Flows</strong>: class jisme methods pe decorators: <code>@start()</code> entry, <code>@listen(method)</code> jab woh method khatam ho, <code>@router(method)</code> jo string lauta ke branch chune; <code>or_</code>/<code>and_</code> se combine. Typed state (Pydantic) <code>self.state</code> mein. <code>@persist</code> state SQLite mein save karta hai; human feedback ke liye bhi decorator hai.`,
      `<strong>Memory</strong>: current docs mein ek <strong>unified Memory class</strong> hai (pehle ke alag short-term/long-term/entity memory types ki jagah). Store karte waqt LLM scope/category/importance tay karta hai; recall semantic + recency + importance se rank hota hai. Default storage LanceDB (ek chhota local vector database, folder <code>./.crewai/memory</code>), aur embeddings (text ke meaning ke number-vectors, <a href="#/ai-tokenization">tokenization lesson</a>) banane ke liye ek embedder model chahiye. <code>Crew(memory=True)</code> se on.`,
      `<strong>Knowledge</strong>: agent ya crew ko documents (PDF, text, CSV) dena jinse wo RAG jaisa retrieve kare.`,
      `<strong>Config style</strong>: chhote examples Python mein; bade projects mein <code>agents.yaml</code> + <code>tasks.yaml</code> aur <code>@CrewBase</code> class (CLI <code>crewai create crew</code> ye structure banata hai).`,
    ] },
    { type: 'code', text: `# CrewAI: do agents, sequential process
from crewai import Agent, Task, Crew, Process

researcher = Agent(role="xyz.com Support Researcher",
                   goal="User ke issue ki sahi wajah dhoondhna",
                   backstory="Tum orders aur video logs padhne mein expert ho.",
                   tools=[get_order_status, get_playback_errors])
writer = Agent(role="Support Reply Writer",
               goal="Polite, chhota, sahi Hinglish reply likhna",
               backstory="Tum xyz.com ki brand voice jaante ho.")

find = Task(description="Issue samjho: {question}",
            expected_output="3 bullet: kya hua, kyun, kya karna hai",
            agent=researcher)
reply = Task(description="Findings se user ko reply likho",
             expected_output="Max 4 line ka reply",
             agent=writer, context=[find])          # find ka output yahan input

crew = Crew(agents=[researcher, writer], tasks=[find, reply],
            process=Process.sequential, memory=True)
print(crew.kickoff(inputs={"question": "Premium video kyun nahi chal raha?"}))` },
    { type: 'code', text: `# CrewAI Flow: router se simple sawaal sasta raasta, complex crew ko
from crewai.flow.flow import Flow, start, listen, router
from pydantic import BaseModel

class SupportState(BaseModel):
    question: str = ""
    answer: str = ""

class SupportFlow(Flow[SupportState]):
    @start()
    def receive(self):
        return self.state.question

    @router(receive)
    def classify(self):
        return "faq" if "password" in self.state.question.lower() else "complex"

    @listen("faq")
    def quick_answer(self):
        self.state.answer = faq_lookup(self.state.question)    # bina crew ke

    @listen("complex")
    def run_crew(self):
        self.state.answer = str(crew.kickoff(inputs={"question": self.state.question}))

SupportFlow().kickoff(inputs={"question": "Password kaise reset karun?"})` },

    { type: 'flow', height: 330, title: 'CrewAI: Flow, Crew aur process',
      nodes: [
        { id: 'fl', label: 'SupportFlow', sub: 'state, router', x: 85, y: 165, w: 140, kind: 'queue', info: 'Ye kya hai: CrewAI Flow, ek event-driven workflow jiski typed state hai. @router decide karta hai ki sawaal ko crew chahiye ya nahi. Flow deterministic hai: kaunsa method kab chalega ye code tay karta hai.' },
        { id: 'mg', label: 'Crew/Manager', sub: 'process', x: 285, y: 165, w: 140, kind: 'server', info: 'Ye kya hai: Crew object jo kickoff() pe tasks chalata hai. Hierarchical process mein yahan ek manager agent bhi hota hai (manager_llm ya manager_agent): wo tasks ko sahi agent ko deta hai, output review karta hai, zarurat ho to wapas bhejta hai. Sequential process mein ye nahi hota; tasks list ke order mein chalte hain.' },
        { id: 'rs', label: 'Researcher', sub: 'role + tools', x: 490, y: 65, w: 150, kind: 'server', info: 'Ye kya hai: research karne wala agent: Agent(role, goal, backstory, tools). Orders aur playback tools ke saath issue ki wajah dhoondhta hai.' },
        { id: 'wr', label: 'Writer', sub: 'role, no tools', x: 490, y: 265, w: 150, kind: 'server', info: 'Ye kya hai: likhne wala agent jo researcher ke findings (task context) se user ke liye reply likhta hai. Iske paas koi tool nahi: jitna kaam utni permission (least privilege).' },
        { id: 'mem', label: 'Memory', sub: 'LanceDB', x: 655, y: 165, w: 100, kind: 'data', info: 'Ye kya hai: crew ki shared memory (unified Memory class). Pichhli conversations se kaam ki baatein yaad rakhta hai. Embeddings + LanceDB storage default.' },
      ],
      edges: [{ a: 'fl', b: 'mg' }, { a: 'mg', b: 'rs' }, { a: 'mg', b: 'wr' }, { a: 'rs', b: 'wr' }, { a: 'rs', b: 'mem', dashed: true }, { a: 'wr', b: 'mem', dashed: true }],
      scenarios: [
        { name: 'Sequential crew', steps: [
          { title: 'Flow → crew', text: 'Router ne "complex" chuna, flow crew.kickoff() karta hai. Sequential process mein koi manager nahi: crew tasks ko list ke order mein chalati hai.', go: 'fl>mg', after: { mg: { sub: 'sequential' } } },
          { title: 'Task 1: research', text: 'Researcher pehla task karta hai, tools se data laata hai, memory se pichhla context bhi.', go: ['mg>rs', 'evt:rs>mem'], after: { rs: { state: 'ok', sub: 'findings ready' } } },
          { title: 'Task 2: reply (context)', text: 'Researcher ka output <code>context=[find]</code> se Writer ke task mein jaata hai.', go: 'rs>wr', msg: 'context: "subscription 1 Oct ko expire, renew link bhejo"' },
          { title: 'Final output', text: 'Last task ka output crew ka result; flow state mein save.', go: 'res:wr>mg>fl', after: { wr: { state: 'ok', sub: 'reply done' }, fl: { sub: 'answer saved' } } },
        ]},
        { name: 'Hierarchical', steps: [
          { title: 'Manager in charge', text: '<code>process=Process.hierarchical</code> + <code>manager_llm</code>. Tasks kisi agent ko pre-assign nahi; manager decide karta hai.', go: 'fl>mg', after: { mg: { state: 'hot', sub: 'manager planning' } } },
          { title: 'Delegate', text: 'Manager research Researcher ko deta hai.', go: ['mg>rs', 'res:rs>mg'] },
          { title: 'Review aur delegate', text: 'Manager output check karta hai, phir writing Writer ko.', go: ['mg>wr', 'res:wr>mg'] },
          { title: 'Validate', text: 'Manager final answer validate karke flow ko lautata hai. Fayda: flexible. Keemat: manager ke extra LLM calls aur kam predictable raasta.', go: 'res:mg>fl', after: { mg: { state: 'ok', sub: 'done' } } },
        ]},
        { name: 'Simple sawaal: crew skip', steps: [
          { title: 'Router: "faq"', text: '"Password kaise reset karun?" Router ne "faq" lautaya. Crew chalti hi nahi: 0 agent calls.', set: { mg: { state: 'dim' }, rs: { state: 'dim' }, wr: { state: 'dim' } }, after: { fl: { state: 'ok', sub: 'faq path' } }, focus: ['fl'] },
          { title: 'Kyun zaroori', text: 'Yahi <a href="#/ai-agent-patterns">routing pattern</a> hai. Har sawaal pe poori crew chalana 2-3 agents ke LLM calls ka kharcha hai.', focus: ['fl'] },
        ]},
        { name: 'Delegation loop', steps: [
          { title: 'Ping-pong', text: 'Hierarchical mein manager aur agents vague instructions pe baar baar kaam wapas bhejte hain.', go: ['mg>rs', 'res:rs>mg', 'mg>rs', 'res:rs>mg'], after: { mg: { state: 'warn', sub: 'iter 9...' } } },
          { title: 'Limit', text: 'Agent ka <code>max_iter</code> (aur crew/agent ke rate limits) loop ko rokta hai; best-effort answer milta hai. Fix: saaf <code>expected_output</code>, kam agents, ya sequential process.', go: 'res:mg>fl', after: { mg: { state: 'down', sub: 'stopped' } } },
        ]},
      ],
    },
    { type: 'p', html: `<strong>Kab CrewAI:</strong> kaam naturally "roles" mein bat-ta hai (researcher, writer, reviewer), tumhe jaldi multi-agent prototype chahiye, aur Flows se predictable outer workflow. <strong>Kab nahi:</strong> ek agent kaafi ho; ya tumhe har step ke prompt pe bahut fine control chahiye (role/backstory abstraction ke peeche asli prompt CrewAI banata hai).` },

    { type: 'h2', text: 'OpenAI Agents SDK: chhote primitives' },
    { type: 'p', html: `OpenAI ka lightweight Python (aur TypeScript) SDK, March 2025 mein aaya. Version abhi 0.x hai (0.23.1), yaani API mein badlav aa sakte hain. Kam concepts, zyada Python: <strong>Agent</strong> (instructions + tools), <strong>Runner</strong> (loop chalata hai), <strong>function_tool</strong> (function se tool), <strong>handoffs</strong>, <strong>guardrails</strong>, <strong>sessions</strong> (history memory), aur built-in <strong>tracing</strong>. Doosre providers ke models bhi chal sakte hain.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Agent, Runner, function_tool (OpenAI SDK)', html: `<strong>Agent</strong> (Ye kya hai): ek object jisme naam, instructions (system prompt), tools aur handoffs hain. Sirf "kaun hai, kya kar sakta hai".<br><strong>Runner</strong> (Ye kya hai): jo agent ko <em>chalata</em> hai: loop, tool calls, handoffs, guardrails, jab tak final output na aaye ya max turns na ho.<br><strong>function_tool</strong> (Ye kya hai): decorator jo normal Python function ko tool bana deta hai; naam, type hints aur docstring se JSON schema khud banta hai.<br><strong>Kyun chahiye:</strong> agent ki "definition" aur "chalana" alag; sirf 3 cheezein seekh ke kaam shuru.<br><strong>Iske bina:</strong> wahi no-framework wala loop aur schema haath se.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Tripwire aur Session', html: `<strong>Tripwire</strong> (Ye kya hai): guardrail ka "alarm taar". Guardrail function <code>tripwire_triggered=True</code> lautaye to Runner turant exception phenk ke run rok deta hai. Jaise darwaze ka sensor jo galat card pe gate band kar de.<br><strong>Kyun chahiye:</strong> galat input pe agent ka kaam aage badhne se pehle rokna.<br><strong>Iske bina:</strong> har jagah if-else se khud rokna.<br><strong>Session</strong> (Ye kya hai): ek store (jaise <code>SQLiteSession("user-42")</code>) jo turns ke beech baat-cheet ki history apne aap save aur load karta hai. Iske bina har call pe pichhli history khud jodni padti.` },
    { type: 'list', items: [
      `<strong>Handoff</strong>: agent conversation doosre agent ko de deta hai (triage → billing). <strong>Agent as tool</strong> (<code>agent.as_tool()</code>): lead agent specialist ko tool ki tarah call karta hai aur control apne paas rakhta hai.`,
      `<strong>Guardrails</strong>: input guardrail (sirf pehle agent pe), output guardrail (sirf last agent pe), tool guardrails (har function tool call pe). Guardrail ka <code>tripwire_triggered=True</code> run ko exception se rok deta hai. Default mein input guardrail agent ke <em>saath parallel</em> chalta hai (kam latency, lekin tripwire se pehle kuch tokens/tools chal sakte hain); blocking mode mein pehle guardrail, phir agent.`,
      `<strong>Sessions</strong>: jaise <code>SQLiteSession("user-42")</code>, turns ke beech history apne aap.`,
      `<strong>Human-in-the-loop</strong>: tool pe "approval chahiye" mark karo; run us call pe ruk ke interruption lautata hai. Ruka hua run <code>RunState</code> ki tarah save (serialize) karke baad mein approve/reject ke saath resume ho sakta hai.`,
      `<strong>Tracing</strong>: by default on; har LLM call, tool, handoff, guardrail ek span.`,
    ] },
    { type: 'code', text: `# OpenAI Agents SDK: triage + handoffs + input guardrail
from agents import (Agent, Runner, function_tool, input_guardrail,
                    GuardrailFunctionOutput, SQLiteSession)

@function_tool
def get_order_status(order_id: str) -> str:
    """xyz.com order ka current status do."""
    return orders_api.status(order_id)

@input_guardrail
async def no_injection(ctx, agent, user_input):
    flagged = looks_like_injection(user_input)         # chhota classifier ya rules
    return GuardrailFunctionOutput(output_info=None, tripwire_triggered=flagged)

orders = Agent(name="Orders", instructions="Order aur refund sawaal.", tools=[get_order_status])
video  = Agent(name="Video", instructions="Playback problems.", tools=[get_playback_errors])
triage = Agent(name="Triage", instructions="Sahi specialist ko handoff karo.",
               handoffs=[orders, video], input_guardrails=[no_injection])

result = Runner.run_sync(triage, "Order 881 kahan hai?", session=SQLiteSession("user-42"))
print(result.final_output)` },
    { type: 'p', html: `<strong>Worked example (parallel vs blocking guardrail):</strong> maan lo guardrail check 0.5 second leta hai aur agent ka pehla model call 2 second. Default (parallel) mein dono saath shuru: safe input pe jawab ~2 second mein; lekin injection pe tripwire 0.5 second pe bajta hai, tab tak agent ka model call shuru ho chuka hota hai (kuch tokens kharch). Blocking mode mein pehle guardrail (0.5s), phir agent (2s): har request ~2.5 second, lekin injection pe agent ka ek bhi token kharch nahi. Tez vs sasta-aur-safe: tum chuno.` },
    { type: 'p', html: `<strong>Kab OpenAI Agents SDK:</strong> kam code mein ek ya kuch agents, handoffs aur guardrails chahiye, tracing bina setup ke, aur team ko kam concepts seekhne hain. <strong>Kab nahi:</strong> jab flow mein bahut saari branches, loops aur parallel steps hon jinhe tum ek explicit graph ki tarah dekhna aur har step pe checkpoint/time-travel chahte ho (wahan LangGraph zyada fit); ya jab stable 1.x API zaroori ho (ye abhi 0.x hai).` },

    { type: 'h2', text: 'Claude Agent SDK: Claude Code as a library' },
    { type: 'p', html: `Anthropic ka Agent SDK (Python + TypeScript) wahi harness deta hai jo <strong>Claude Code</strong> ke peeche hai: agent loop, context management (compaction, yaani context bharne lage to purani history ka chhota summary), built-in tools (files Read/Write/Edit, Bash, Glob/Grep, WebSearch/WebFetch), permissions, hooks, sub-agents, MCP, sessions, aur project ke <code>.claude/</code> se skills/memory. Matlab tum loop nahi, sirf task aur options dete ho. <a href="#/ai-harness">Harness lesson</a> ke saare parts yahan ready hain.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Permission mode, Hook, MCP server', html: `<strong>Permission mode</strong> (Ye kya hai): ek setting jo batati hai agent kaunse kaam bina poochhe kar sakta hai. Jaise <code>acceptEdits</code> = file edits apne aap OK, baaki pe poochho. Iske bina ya to har chhoti cheez pe "allow?" ya sab kuch bina roke.<br><strong>Hook</strong> (Ye kya hai): tumhara apna function jo kisi event pe chalta hai, jaise har tool call se pehle (<code>PreToolUse</code>). Usme tum <code>rm -rf</code> jaisa command rok sakte ho ya audit log likh sakte ho. Ye code hai, prompt nahi, isliye model ise "convince" nahi kar sakta.<br><strong>MCP server</strong> (yaad dilaana, <a href="#/ai-agents">agents lesson</a>): tools dene ka standard tareeka. Claude Agent SDK mein custom tool ek chhote in-process MCP server ke through judta hai, aur uska poora naam <code>mcp__&lt;server&gt;__&lt;tool&gt;</code> hota hai.<br><strong>Kyun chahiye:</strong> agent ko files aur terminal jaisi taakat milti hai; inhi teeno se us taakat pe lagaam.` },
    { type: 'list', items: [
      `<strong>query()</strong>: async iterator; har message (reasoning, tool call, tool result, final result) stream hota hai.`,
      `<strong>ClaudeAgentOptions</strong>: <code>allowed_tools</code> (bina poochhe chalne wale tools), <code>permission_mode</code> (jaise <code>acceptEdits</code>), <code>system_prompt</code>, <code>mcp_servers</code>, hooks, agents (sub-agents).`,
      `<strong>Custom tools</strong>: <code>@tool</code> + <code>create_sdk_mcp_server</code> se in-process MCP server; tool ka poora naam <code>mcp__server__tool</code>.`,
      `<strong>Hooks</strong>: tool call se pehle/baad apna code (jaise <code>rm -rf</code> block karna, audit log).`,
      `<strong>Sub-agents</strong>: focused kaam ke liye alag context wale agents (<a href="#/ai-agent-patterns">orchestrator pattern</a>).`,
    ] },
    { type: 'code', text: `# Claude Agent SDK: built-in tools + permissions, loop SDK chalata hai
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="xyz.com ke upload service mein crash wala bug dhoondo aur fix karo",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Glob", "Grep"],   # auto-approve
            permission_mode="acceptEdits",
        ),
    ):
        print(message)

asyncio.run(main())` },
    { type: 'p', html: `<strong>Kab:</strong> agent ko files, terminal, code ke saath kaam karna hai (coding agents, ops automation, research jo files likhe), aur tum Claude models use kar rahe ho. <strong>Kab nahi:</strong> doosre model provider chahiye, ya bas ek simple chat + 2 tools (bhaari lagega).` },

    { type: 'h2', text: 'Google ADK (Agent Development Kit)' },
    { type: 'p', html: `Google ka open-source framework (April 2025 mein launch; abhi 2.x). Python, TypeScript, Go, Java aur Kotlin mein. Gemini ke liye optimised, lekin doosre models bhi chal sakte hain. Concepts:` },
    { type: 'callout', tone: 'term', title: 'Naye words: Workflow agent aur A2A', html: `<strong>Workflow agent</strong> (Ye kya hai): ADK ka aisa "agent" jo khud LLM nahi chalata, sirf apne andar ke agents ko ek fixed tareeke se chalata hai: <code>SequentialAgent</code> (ek ke baad ek), <code>ParallelAgent</code> (saath saath), <code>LoopAgent</code> (shart poori hone tak dobara). Ye <a href="#/ai-agent-patterns">workflow patterns</a> hi hain, ready classes ke roop mein.<br><strong>Kyun chahiye:</strong> jahan raasta fixed hai wahan LLM ko raasta chunne dena bekaar kharcha aur risk.<br><strong>Iske bina:</strong> order ka logic khud likhna, ya LLM se "ab finder chalao, phir writer" karwana.<br><strong>A2A</strong> (Agent2Agent protocol, Ye kya hai): alag alag systems/companies ke agents ke aapas mein baat karne ka open standard. Jaise MCP agent ko tools se jodta hai, A2A agent ko <em>doosre agent</em> se jodta hai.` },
    { type: 'list', items: [
      `<strong>Agent / LlmAgent</strong>: model + instruction + tools.`,
      `<strong>Workflow agents</strong>: <code>SequentialAgent</code>, <code>ParallelAgent</code>, <code>LoopAgent</code>: bina LLM ke deterministic orchestration (<a href="#/ai-agent-patterns">workflow patterns</a> seedhe classes ke roop mein). ADK 2.0 mein graph-based workflows bhi aaye.`,
      `<strong>Multi-agent</strong>: <code>sub_agents</code> se tree; agents ek doosre ko delegate kar sakte hain; remote agents ke liye A2A protocol.`,
      `<strong>Tools</strong>: Python functions, MCP tools, OpenAPI, Google Search jaise built-ins.`,
      `<strong>Sessions + state</strong> (SessionService), <strong>Runner</strong> (execution), aur dev UI (<code>adk web</code>), CLI (<code>adk run</code>), evaluation tools.`,
    ] },
    { type: 'code', text: `# Google ADK: ek agent + ek sequential workflow
from google.adk.agents import Agent, SequentialAgent

def get_order_status(order_id: str) -> dict:
    """xyz.com order ka current status do."""
    return {"status": orders_api.status(order_id)}

finder = Agent(name="finder", model="gemini-flash-latest",
               instruction="Order ka status nikalo.", tools=[get_order_status],
               output_key="findings")                     # result state mein
writer = Agent(name="writer", model="gemini-flash-latest",
               instruction="{findings} se user ke liye polite reply likho.")

root_agent = SequentialAgent(name="support", sub_agents=[finder, writer])
# chalao: adk web  (dev UI)  ya  Runner + InMemorySessionService` },
    { type: 'p', html: `<strong>Worked example:</strong> upar <code>finder</code> apna jawab <code>output_key="findings"</code> se state mein rakhta hai, jaise <code>state["findings"] = "Order 881: shipped, kal delivery"</code>. Phir <code>writer</code> ki instruction mein <code>{findings}</code> us value se bhar jaata hai. SequentialAgent ne order tay kiya, kisi LLM ne nahi.` },
    { type: 'p', html: `<strong>Kab Google ADK:</strong> Gemini / Google Cloud (Vertex AI) pe ho, team Java, Go ya TypeScript mein bhi kaam karti hai, ya tumhe workflow agents + LLM agents ka mix aur dev UI/eval tools ek jagah chahiye. <strong>Kab nahi:</strong> poora stack kisi aur cloud/provider pe hai aur Google ka koi hissa use nahi ho raha; ya ek chhota sa single agent jahan provider SDK kaafi hai.` },

    { type: 'h2', text: 'AutoGen → Microsoft Agent Framework' },
    { type: 'p', html: `<strong>AutoGen</strong> (Microsoft Research, 2023) multi-agent "conversations" ka pioneer tha: agents aapas mein chat karke kaam karte the (jaise ek AssistantAgent code likhe, doosra execute karke feedback de). <strong>Semantic Kernel</strong> Microsoft ka enterprise SDK tha. Dono teams ne milke <strong>Microsoft Agent Framework</strong> banaya; iska 1.0 April 2026 mein GA hua (General Availability, yaani production ke liye ready maana gaya release), aur AutoGen + Semantic Kernel ab maintenance mode mein hain (sirf bug/security fixes). Naye project ke liye AutoGen nahi, Agent Framework.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Maintenance mode', html: `<strong>Ye kya hai:</strong> jab koi software "zinda" to hai par usme naye features nahi aate; sirf bug aur security fixes. Jaise purana phone model jo bikna band ho gaya, par updates thode samay milte rahenge.<br><strong>Kyun jaanna zaroori:</strong> naya project aise framework pe shuru karoge to kal ki zaroori features (naye models, naye protocols) nahi milengi.<br><strong>Iske bina (ye na jaano to):</strong> 2023 ke AutoGen tutorial se naya project shuru kar doge aur baad mein migrate karna padega.` },
    { type: 'list', items: [
      `<strong>Agents</strong>: chat client (OpenAI, Azure/Foundry, Anthropic, Ollama...) + instructions + tools/MCP.`,
      `<strong>Sessions</strong> (state), <strong>context providers</strong> (memory), <strong>middleware</strong> (agent ke actions intercept), tool approval (HITL), telemetry (OpenTelemetry).`,
      `<strong>Workflows</strong>: graph-based, explicit execution paths, multi-agent orchestration, checkpointing aur human-in-the-loop ke saath.`,
      `<strong>Harness Agent</strong>: batteries-included agent lambe kaam ke liye (planning/todos, context compaction, file memory, approvals).`,
      `Languages: .NET aur Python (Go preview). Azure/Foundry ke saath sabse smooth, lekin wahan tak seemit nahi.`,
    ] },
    { type: 'code', text: `# Microsoft Agent Framework (Python) sketch
from agent_framework.openai import OpenAIChatCompletionClient

agent = OpenAIChatCompletionClient(model="gpt-5.4-mini").as_agent(
    name="xyzSupport",
    instructions="Tum xyz.com ke support assistant ho.",
    tools=[get_order_status],
)
result = await agent.run("Order 881 kahan hai?")
print(result.text)` },
    { type: 'p', html: `<strong>Kab Microsoft Agent Framework:</strong> .NET ya Python team, Azure/Foundry pe deployment, enterprise needs (telemetry, approvals, graph workflows with checkpointing), ya purana AutoGen/Semantic Kernel code naye framework pe le jaana hai. <strong>Kab nahi:</strong> chhota prototype jahan itne enterprise features ki zarurat nahi; ya tumhari team pehle se kisi aur framework pe settled hai aur Microsoft stack nahi use karti.` },
    { type: 'callout', tone: 'tip', title: 'Microsoft ki apni salah', html: `Agent Framework ke docs mein ek seedhi line hai: agar task ek normal function se ho sakta hai, to wahi likho, AI agent mat banao. Open-ended kaam ke liye agent; saaf steps ke liye workflow.` },

    { type: 'h2', text: 'LlamaIndex: data aur RAG pe focus' },
    { type: 'p', html: `LlamaIndex (2022 se, pehle "GPT Index") ka focus <strong>tumhare data</strong> pe hai: PDFs, docs, databases ko load karna, todna, index karna, aur unpe query/agents. xyz.com ke help-docs search (<a href="#/ai-rag">RAG lesson</a>) ke liye natural fit.` },
    { type: 'callout', tone: 'term', title: 'Naye words: Reader, Node, Index, Query engine', html: `<strong>Reader</strong> (Ye kya hai): data laane wala connector. Folder, PDF, Notion, S3 se text padh ke <em>Documents</em> banata hai.<br><strong>Node</strong> (Ye kya hai): document ka ek chhota tukda (chunk) + metadata (kaunsi file, kaunsa page). LangGraph ke "node" se bilkul alag cheez hai; sirf naam same hai.<br><strong>Index</strong> (Ye kya hai): nodes ko aise sajana ki dhoondhna tez ho. <code>VectorStoreIndex</code> har node ka embedding (meaning ka number-vector) rakhta hai.<br><strong>Query engine</strong> (Ye kya hai): ek sawaal lo → relevant nodes dhoondo → LLM se unke basis pe jawab likhwao. Poori <a href="#/ai-rag">RAG</a> pipeline ek object mein.<br><strong>Kyun chahiye:</strong> RAG ke 5-6 steps (load, chunk, embed, store, retrieve, answer) har project mein same hain.<br><strong>Iske bina:</strong> har step ka code aur har data source ka alag parser khud likhna.` },
    { type: 'list', items: [
      `<strong>Readers / data connectors</strong>: <code>SimpleDirectoryReader</code> aur hazaaron connectors (Notion, Slack, S3...). <strong>LlamaParse</strong>: mushkil PDFs, tables, scanned docs ka parsing (hosted).`,
      `<strong>Documents → Nodes</strong>: document ke chunks "nodes" kehlate hain, metadata ke saath.`,
      `<strong>Indexes</strong>: <code>VectorStoreIndex</code> (embeddings), aur summary/keyword/property-graph indexes. Kisi bhi vector DB pe.`,
      `<strong>Query engine</strong> (ek sawaal → retrieve → answer) aur <strong>chat engine</strong> (multi-turn).`,
      `<strong>Agents</strong>: <code>FunctionAgent</code>, multi-agent ke liye <code>AgentWorkflow</code>.`,
      `<strong>Workflows</strong>: event-driven steps (<code>@step</code> functions jo events lete/dete hain), branching, human review.`,
    ] },
    { type: 'code', text: `# LlamaIndex: help docs ka index + agent jo usse tool ki tarah use kare
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.agent.workflow import FunctionAgent

docs = SimpleDirectoryReader("xyz_help_docs").load_data()
index = VectorStoreIndex.from_documents(docs)        # chunk + embed + store
query_engine = index.as_query_engine()

async def search_help(query: str) -> str:
    """xyz.com help docs mein jawab dhoondo."""
    return str(await query_engine.aquery(query))

agent = FunctionAgent(tools=[search_help, get_order_status], llm=llm,
                      system_prompt="Tum xyz.com ke support assistant ho.")
response = await agent.run("Download limit kitni hai?")` },
    { type: 'p', html: `<strong>Worked example:</strong> xyz.com ke 40 help docs. Har doc ~5 tukdon mein bata, to ~200 nodes, har ek ka embedding index mein. Sawaal "Download limit kitni hai?" pe query engine top-2 nodes laata hai (dono "Downloads" page se) aur LLM sirf in 2 tukdon ko padh ke jawab likhta hai. 200 mein se sirf 2 tukde prompt mein: kam tokens, kam hallucination.` },
    { type: 'p', html: `<strong>Kab LlamaIndex:</strong> main kaam documents/data pe sawaal-jawab hai (PDFs, wikis, tables), bahut saare data sources jodne hain, ya mushkil PDFs parse karne hain. <strong>Kab nahi:</strong> data hai hi nahi, sirf tools aur actions wala agent; ya multi-agent orchestration hi main kaam hai (tab retrieval LlamaIndex se lo aur orchestration kisi aur se, ya seedha LangGraph/CrewAI).` },

    { type: 'h2', text: 'Ek hi kaam, alag frameworks mein' },
    { type: 'p', html: `Task same: xyz Assistant ko <code>get_order_status</code> tool do aur poochho "Order 881 kahan hai?". Tab badal ke dekho code kaisa dikhta hai aur framework free mein kya deta hai. (Tool function <code>orders_api.status()</code> sab mein same maana hai.)` },
    { type: 'custom', render(el) {
      const T = [
        { k: 'none', n: 'No framework', free: 'Kuch nahi: loop, stop condition, tool dispatch, history sab tumhara. Badle mein poora control aur zero magic.', code: `import anthropic
client = anthropic.Anthropic()
tools = [{"name": "get_order_status", "description": "Order ka status do",
          "input_schema": {"type": "object", "required": ["order_id"],
                           "properties": {"order_id": {"type": "string"}}}}]
msgs = [{"role": "user", "content": "Order 881 kahan hai?"}]
for turn in range(5):
    r = client.messages.create(model="claude-sonnet-4-6", max_tokens=1024,
                               tools=tools, messages=msgs)
    msgs.append({"role": "assistant", "content": r.content})
    if r.stop_reason != "tool_use":
        break
    msgs.append({"role": "user", "content": [
        {"type": "tool_result", "tool_use_id": b.id,
         "content": orders_api.status(**b.input)}
        for b in r.content if b.type == "tool_use"]})
print(r.content[-1].text)` },
        { k: 'lc', n: 'LangChain', free: 'Docstring se schema, ready loop, kisi bhi provider ka model ek string se, middleware (HITL, summarisation, PII).', code: `from langchain.agents import create_agent
from langchain.tools import tool

@tool
def get_order_status(order_id: str) -> str:
    """Order ka status do."""
    return orders_api.status(order_id)

agent = create_agent(model="claude-sonnet-4-6", tools=[get_order_status],
                     system_prompt="Tum xyz.com ke support assistant ho.")
out = agent.invoke({"messages": [{"role": "user", "content": "Order 881 kahan hai?"}]})
print(out["messages"][-1].content)` },
        { k: 'lg', n: 'LangGraph', free: 'Har step explicit graph mein; checkpointer se memory, crash-resume, interrupts. Zyada code, zyada control.', code: `from langgraph.graph import StateGraph, MessagesState, START
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import InMemorySaver
from langchain.chat_models import init_chat_model
# get_order_status: wahi @tool jo LangChain tab mein hai

model = init_chat_model("anthropic:claude-sonnet-4-6").bind_tools([get_order_status])
def agent(state: MessagesState):
    return {"messages": [model.invoke(state["messages"])]}

g = StateGraph(MessagesState)
g.add_node("agent", agent)
g.add_node("tools", ToolNode([get_order_status]))
g.add_edge(START, "agent")
g.add_conditional_edges("agent", tools_condition)   # tool call? tools : END
g.add_edge("tools", "agent")
app = g.compile(checkpointer=InMemorySaver())
app.invoke({"messages": [("user", "Order 881 kahan hai?")]},
           {"configurable": {"thread_id": "user-42"}})` },
        { k: 'crew', n: 'CrewAI', free: 'Role/goal/backstory se prompt ban jaata hai; tasks, expected_output, memory, aur baad mein aur agents jodna aasaan.', code: `from crewai import Agent, Task, Crew
from crewai.tools import tool

@tool("Order status")
def get_order_status(order_id: str) -> str:
    """Order ka status do."""
    return orders_api.status(order_id)

support = Agent(role="xyz.com Support Agent", goal="Order sawaal ka sahi jawab",
                backstory="Tum xyz.com support mein 3 saal se ho.",
                tools=[get_order_status])
task = Task(description="User ka sawaal: {question}",
            expected_output="2 line ka polite jawab", agent=support)
print(Crew(agents=[support], tasks=[task]).kickoff(
    inputs={"question": "Order 881 kahan hai?"}))` },
        { k: 'oai', n: 'OpenAI Agents SDK', free: 'Sabse kam code; type hints se schema; tracing on; handoffs/guardrails/sessions ek line door.', code: `from agents import Agent, Runner, function_tool

@function_tool
def get_order_status(order_id: str) -> str:
    """Order ka status do."""
    return orders_api.status(order_id)

agent = Agent(name="xyz Support", instructions="Tum xyz.com ke support assistant ho.",
              tools=[get_order_status])
print(Runner.run_sync(agent, "Order 881 kahan hai?").final_output)` },
        { k: 'claude', n: 'Claude Agent SDK', free: 'Claude Code ka poora harness: built-in tools, permissions, hooks, compaction, sub-agents. Custom tool MCP server ke through.', code: `from claude_agent_sdk import tool, create_sdk_mcp_server, ClaudeAgentOptions, query

@tool("get_order_status", "Order ka status do", {"order_id": str})
async def get_order_status(args):
    return {"content": [{"type": "text", "text": orders_api.status(args["order_id"])}]}

xyz = create_sdk_mcp_server(name="xyz", version="1.0.0", tools=[get_order_status])
opts = ClaudeAgentOptions(mcp_servers={"xyz": xyz},
                          allowed_tools=["mcp__xyz__get_order_status"],
                          system_prompt="Tum xyz.com ke support assistant ho.")
async for msg in query(prompt="Order 881 kahan hai?", options=opts):
    print(msg)` },
      ];
      el.innerHTML = `<div class="chips fw-chips" role="group" aria-label="Framework"></div>
        <div class="stats"><div class="stat"><span>Code lines (comments chhod ke)</span><strong class="fw-lines"></strong></div><div class="stat"><span>Framework</span><strong class="fw-name"></strong></div></div>
        <pre class="code fw-code" style="max-height:420px;overflow:auto"></pre>
        <p class="calc-note fw-free"></p>`;
      const chips = el.querySelector('.fw-chips');
      const lines = c => c.split('\n').filter(l => l.trim() !== '' && !l.trim().startsWith('#')).length;
      function show(i) {
        [...chips.children].forEach((b, j) => b.classList.toggle('on', i === j));
        el.querySelector('.fw-code').textContent = T[i].code;
        el.querySelector('.fw-lines').textContent = lines(T[i].code);
        el.querySelector('.fw-name').textContent = T[i].n;
        el.querySelector('.fw-free').innerHTML = '<strong>Free mein mila:</strong> ' + T[i].free;
      }
      T.forEach((t, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t.n; b.onclick = () => show(i); chips.appendChild(b); });
      show(0);
    } },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Kam lines = behtar framework" nahi. OpenAI SDK ka 8 line ka version aur no-framework ka 17 line ka version andar se <em>same</em> loop chalate hain. Farak ye hai ki baad mein jab approval, crash-resume, multi-agent chahiye, tab kitna code aur likhna padega, aur debugging ke waqt kitna chhupa hai.` },

    { type: 'h2', text: 'Apni zaroorat chuno, framework pao' },
    { type: 'p', html: `Neeche apne project ki zaroorat ke chips on karo. Har zaroorat har framework ko 0-3 points deti hai (ye scoring is lesson ki research pe based ek rule of thumb hai, koi official ranking nahi). Top 3 dikhte hain, kyun ke saath.` },
    { type: 'custom', render(el) {
      const F = { none: 'No framework', oai: 'OpenAI Agents SDK', lc: 'LangChain', lg: 'LangGraph', crew: 'CrewAI', claude: 'Claude Agent SDK', adk: 'Google ADK', maf: 'Microsoft Agent Framework', llama: 'LlamaIndex' };
      const ORDER = ['none', 'oai', 'lc', 'lg', 'crew', 'claude', 'adk', 'maf', 'llama'];
      const N = [
        ['simple', 'Simple: ek agent, kuch tools', { none: 3, oai: 3, lc: 2, adk: 2, claude: 1, maf: 1, crew: 1, llama: 1 }],
        ['flow', 'Custom flow: branch, loop, parallel', { lg: 3, maf: 2, adk: 2, crew: 2, llama: 2, none: 1 }],
        ['durable', 'Crash-resume, ghanton baad approval', { lg: 3, maf: 2, crew: 1, claude: 1, adk: 1, llama: 1, oai: 1 }],
        ['team', 'Role-based team, jaldi prototype', { crew: 3, adk: 1, maf: 1, oai: 1, lg: 1 }],
        ['rag', 'Docs/PDF pe RAG main kaam', { llama: 3, lc: 2, crew: 1, adk: 1, maf: 1 }],
        ['code', 'Files, terminal, code pe kaam', { claude: 3, none: 1 }],
        ['handoff', 'Handoffs + guardrails, OpenAI models', { oai: 3, maf: 1, lg: 1, adk: 1 }],
        ['google', 'Gemini / Google Cloud, Java/Go', { adk: 3 }],
        ['dotnet', '.NET / Azure enterprise', { maf: 3 }],
        ['multi', 'Kai model providers switch karne', { lc: 3, lg: 2, llama: 2, crew: 2, maf: 2, adk: 1, oai: 1 }],
        ['minimal', 'Kam dependencies, poora control', { none: 3, oai: 2 }],
      ];
      const WHY = { none: 'Seedha model SDK + apna loop: sabse transparent, sabse kam magic.', oai: 'Kam primitives (Agent, Runner, handoffs, guardrails), tracing built-in.', lc: 'create_agent + middleware, sabse bada integrations ecosystem, provider-agnostic models.', lg: 'Explicit graph, checkpoints, interrupts: durable aur controllable agents.', crew: 'Agents/Tasks/Crew/Process se team jaldi; Flows se predictable outer workflow.', claude: 'Claude Code ka harness: files/bash tools, permissions, hooks, sub-agents.', adk: 'Gemini-first, Sequential/Parallel/Loop agents, 5 languages, A2A.', maf: 'AutoGen + Semantic Kernel ka successor: .NET/Python, workflows, Azure/Foundry.', llama: 'Loaders, indexes, query engines: data-heavy RAG agents ke liye.' };
      el.innerHTML = `<div class="chips fr-chips" role="group" aria-label="Needs"></div><div class="fr-out" style="margin-top:10px"></div>`;
      const sel = new Set();
      const chips = el.querySelector('.fr-chips');
      N.forEach(([k, label]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = label; b.dataset.k = k;
        b.onclick = () => { sel.has(k) ? sel.delete(k) : sel.add(k); b.classList.toggle('on', sel.has(k)); draw(); }; chips.appendChild(b); });
      function draw() {
        const out = el.querySelector('.fr-out');
        if (!sel.size) { out.innerHTML = '<p class="calc-note">Kuch select nahi kiya. Default: <strong>no framework</strong> ya sabse simple SDK se shuru karo, zaroorat aane pe badlo.</p>'; return; }
        const sc = ORDER.map((f, i) => ({ f, i, s: N.filter(n => sel.has(n[0])).reduce((a, n) => a + (n[2][f] || 0), 0) }));
        sc.sort((a, b) => b.s - a.s || a.i - b.i);
        const top = sc.filter(x => x.s > 0).slice(0, 3);
        const max = top[0].s;
        out.innerHTML = top.map((x, r) => `<div style="border:1px solid var(--line);border-radius:var(--r);padding:8px 10px;margin:6px 0;background:${r === 0 ? 'var(--accent-soft)' : 'var(--surface)'}">
          <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><strong>${r + 1}. ${F[x.f]}</strong><span style="font-family:var(--f-mono);color:var(--ink-2)">${x.s} pts</span></div>
          <div style="height:6px;border-radius:3px;background:var(--accent);width:${(100 * x.s / max).toFixed(0)}%;margin:4px 0"></div>
          <div style="color:var(--ink-2);font-size:14px">${WHY[x.f]}</div></div>`).join('') +
          '<p class="calc-note">Yaad rakho: frameworks mix bhi hote hain (jaise LlamaIndex retrieval + LangGraph orchestration). Final faisla ek chhote prototype aur eval se karo.</p>';
      }
      draw();
    } },

    { type: 'h2', text: 'Side-by-side comparison' },
    { type: 'table', head: ['Framework', 'Mental model', 'Multi-agent', 'State / HITL', 'Best at'], rows: [
      ['No framework', 'Tumhara apna while loop', 'Khud likho', 'Khud likho', 'Chhote, transparent agents'],
      ['LangChain', 'Building blocks + create_agent', 'Via LangGraph', 'Middleware (HITL), LangGraph checkpoints', 'Jaldi standard agent, integrations'],
      ['LangGraph', 'State machine graph', 'Graph nodes, Send, Command', 'Checkpointer, interrupt/resume, time travel', 'Custom, durable, controllable flows'],
      ['CrewAI', 'Team: Agent, Task, Crew, Process', 'Sequential / hierarchical crews', 'Flows state + @persist, human feedback', 'Role-based teams, quick prototypes'],
      ['OpenAI Agents SDK', 'Agent + Runner', 'Handoffs, agents-as-tools', 'Sessions, tool approval + RunState resume, guardrail tripwires', 'Minimal code, built-in tracing'],
      ['Claude Agent SDK', 'Claude Code harness as library', 'Sub-agents', 'Sessions, permissions, hooks', 'Coding/file/terminal agents'],
      ['Google ADK', 'Agents + workflow agents', 'sub_agents tree, A2A', 'Sessions/state, graph workflows (2.x)', 'Gemini/GCP, many languages'],
      ['MS Agent Framework', 'Agents + graph workflows', 'Workflows, agent-as-tool', 'Sessions, checkpoints, tool approval', '.NET/Python enterprise, Azure'],
      ['LlamaIndex', 'Data → index → query', 'AgentWorkflow', 'Workflows (events, human review)', 'RAG over documents'],
    ] },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Pehle sawaal: framework chahiye bhi?</strong> Ek agent, kuch tools, simple flow → <strong>no framework</strong> ya <strong>OpenAI Agents SDK</strong>/<strong>LangChain create_agent</strong> jaisa halka option.<br><strong>Flow custom hai, crash-resume ya ghanton baad approval chahiye</strong> → <strong>LangGraph</strong> (ya .NET/Azure mein <strong>Microsoft Agent Framework</strong> workflows).<br><strong>Kaam roles mein bat-ta hai, jaldi multi-agent demo</strong> → <strong>CrewAI</strong> (production mein Flow ke andar crew).<br><strong>Main kaam documents pe RAG</strong> → <strong>LlamaIndex</strong> (retrieval), orchestration kisi aur se bhi kar sakte ho.<br><strong>Agent ko files/terminal/code chalana hai</strong> → <strong>Claude Agent SDK</strong>.<br><strong>Gemini/Google Cloud ya Java/Go team</strong> → <strong>Google ADK</strong>.<br><strong>AutoGen</strong> naye project ke liye nahi (maintenance mode); Microsoft Agent Framework lo.<br>Har case mein: chhota prototype + <a href="#/ai-agent-patterns">eval set</a> se confirm karo.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Framework lagaya to agent achha ho jaayega." Framework plumbing deta hai, <strong>quality nahi</strong>. Agent ki quality abhi bhi prompts, tool descriptions, context aur evals se aati hai. Aur framework ke default prompts (jaise CrewAI ka role/backstory se bana prompt) ek baar zaroor print karke padho: jo tum dekh nahi sakte, use debug nahi kar sakte.` },
    { type: 'callout', tone: 'why', title: 'Lock-in kam kaise karein', html: `<strong>Lock-in</strong> = ek framework mein itna phans jaana ki use badalna bahut mehenga ho jaaye. Bachne ke tareeke: tools ko <strong>MCP servers</strong> ki tarah banao (<a href="#/ai-agents">agents lesson</a>): lagbhag har framework MCP tools use kar sakta hai, to framework badalne pe tools nahi likhne padte. Business logic (orders_api) framework se bahar rakho; framework sirf orchestration kare. Agents ke beech, alag systems mein, A2A jaise protocols aa rahe hain.` },

    { type: 'h2', text: 'Poori picture: kaunsa framework kahan baithta hai' },
    { type: 'p', html: `Neeche ka naksha do sawaalon pe bana hai. <strong>Left → right:</strong> raasta kaun chunta hai? Left mein tumhara code (zyada control), right mein model (zyada autonomy). <strong>Upar → neeche:</strong> kaam kis tarah ka hai? Upar data/RAG ya ek agent, neeche agents ki team (multi-agent). Position ek rough guide hai, koi official ranking nahi: zyaadatar frameworks dono taraf kuch na kuch kar lete hain. Buttons se ek family chuno.` },
    { type: 'diagram', title: 'Frameworks ka naksha: control vs autonomy, data vs team', height: 570,
      groups: [
        { label: 'Zyada control · data / ek agent', x: 10, y: 10, w: 345, h: 270 },
        { label: 'Zyada autonomy · data / ek agent', x: 365, y: 10, w: 345, h: 270 },
        { label: 'Zyada control · multi-agent', x: 10, y: 290, w: 345, h: 270 },
        { label: 'Zyada autonomy · multi-agent', x: 365, y: 290, w: 345, h: 270 },
      ],
      nodes: [
        { id: 'llama', label: 'LlamaIndex', sub: 'data → index → query', x: 190, y: 85, w: 160, kind: 'data', info: 'Ye kya hai: data-first framework. Readers se documents, nodes (chunks), index, query engine. Raasta zyaadatar fixed (retrieve → answer), isliye control wali taraf; agents aur workflows bhi hain.' },
        { id: 'none', label: 'No framework', sub: 'apna loop', x: 120, y: 210, w: 140, kind: 'client', info: 'Ye kya hai: provider ka SDK + tumhara 20 line ka loop. Sabse zyada control aur transparency, koi magic nahi. Ek agent, kuch tools ke liye aksar sabse achha shuruaat.' },
        { id: 'lc', label: 'LangChain', sub: 'create_agent, RAG blocks', x: 470, y: 85, w: 180, kind: 'server', info: 'Ye kya hai: building blocks (models, prompts, retrievers, tools) + ready agent loop (create_agent) + middleware. Model loop chalata hai, isliye autonomy ki taraf; RAG ke blocks ki wajah se upar.' },
        { id: 'claude', label: 'Claude Agent SDK', sub: 'files, bash, hooks', x: 610, y: 210, w: 170, kind: 'server', info: 'Ye kya hai: Claude Code ka harness ek library ki tarah. Agent khud files padhta, edit karta, commands chalata hai: bahut autonomy, jise permissions aur hooks se lagaam. Sub-agents bhi, lekin main use ek taakatwar agent.' },
        { id: 'lg', label: 'LangGraph', sub: 'graph + checkpoints', x: 120, y: 360, w: 160, kind: 'server', info: 'Ye kya hai: explicit graph (state, nodes, edges) + checkpointer + interrupt. Raasta tumhara code (graph) tay karta hai, isliye control; multi-agent graphs, durable flows ke liye top choice.' },
        { id: 'adk', label: 'Google ADK', sub: 'workflow + LLM agents', x: 360, y: 400, w: 160, kind: 'server', info: 'Ye kya hai: Google ka framework. Workflow agents (Sequential/Parallel/Loop) control dete hain, LLM agents aur sub_agents autonomy; isliye beech mein. A2A se doosre systems ke agents se baat.' },
        { id: 'oai', label: 'OpenAI Agents SDK', sub: 'handoffs, guardrails', x: 540, y: 360, w: 160, kind: 'server', info: 'Ye kya hai: kam primitives wala SDK: Agent, Runner, handoffs, guardrails, sessions, tracing. Agents handoff se ek doosre ko control dete hain, isliye autonomy + multi-agent ki taraf.' },
        { id: 'maf', label: 'MS Agent Framework', sub: 'agents + workflows', x: 200, y: 480, w: 170, kind: 'server', info: 'Ye kya hai: Microsoft ka framework (AutoGen + Semantic Kernel ka successor). Graph workflows checkpointing ke saath (control), agents aur multi-agent orchestration; .NET aur Python.' },
        { id: 'ag', label: 'AutoGen', sub: 'maintenance mode', x: 450, y: 480, w: 140, kind: 'queue', info: 'Ye kya hai: Microsoft Research ka purana multi-agent "conversation" framework (2023). Agents aapas mein chat karke kaam karte the: zyada autonomy. Ab maintenance mode mein; naye kaam ke liye MS Agent Framework.' },
        { id: 'crew', label: 'CrewAI', sub: 'roles, crews, flows', x: 630, y: 470, w: 150, kind: 'server', info: 'Ye kya hai: role-based team framework. Crews (agents + tasks + process) autonomy ki taraf, khaaskar hierarchical manager ke saath; Flows se upar ek predictable layer bhi.' },
      ],
      edges: [
        { a: 'lc', b: 'lg', label: 'runs on', dashed: true },
        { a: 'ag', b: 'maf', label: 'successor', kind: 'evt' },
      ],
      paths: [
        { name: 'No framework', text: 'Sabse left: poora control, zero magic. Ek agent + kuch tools ho to yahin se shuru karo; zarurat dikhe tabhi framework lo.', go: ['none'] },
        { name: 'LangChain family', text: 'LangChain ka create_agent andar se LangGraph pe chalta hai. Jaldi agent chahiye to LangChain; custom graph, checkpoints, interrupts chahiye to seedha LangGraph.', go: ['lc>lg'] },
        { name: 'Data / RAG', text: 'Main kaam documents pe sawaal-jawab: LlamaIndex (data-first), ya LangChain ke retrievers. Dono ko kisi orchestration framework ke saath mila bhi sakte ho.', go: ['llama', 'lc'] },
        { name: 'Vendor SDKs', text: 'Model companies ke apne SDK: OpenAI Agents SDK (handoffs, guardrails), Claude Agent SDK (files/terminal wala harness), Google ADK (Gemini, workflow agents, A2A).', go: ['oai', 'claude', 'adk'] },
        { name: 'Teams / enterprise', text: 'Agents ki team: CrewAI (roles, crews, flows) aur Microsoft Agent Framework (enterprise workflows). AutoGen ka kaam ab MS Agent Framework mein aage badhta hai.', go: ['crew', 'ag>maf'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Framework <strong>plumbing</strong> deta hai (loop, tool schema, state, checkpoints, HITL, multi-agent, tracing), <strong>quality nahi</strong>. Quality prompts, tools, context aur evals se aati hai.</li>
      <li>Pehle poochho: framework chahiye bhi? Ek agent + kuch tools = <strong>no framework</strong> ya halka SDK.</li>
      <li><strong>LangChain</strong>: Runnables/LCEL chains + <code>create_agent</code> + middleware. <strong>LangGraph</strong>: state, nodes, edges, reducers, checkpointer + thread_id, <code>interrupt()</code> → durable aur controllable.</li>
      <li><strong>CrewAI</strong>: Agent (role/goal/backstory), Task, Crew, Process (sequential/hierarchical), aur Flows se predictable outer layer.</li>
      <li><strong>OpenAI Agents SDK</strong>: Agent + Runner, handoffs vs agents-as-tools, guardrail tripwires, sessions. <strong>Claude Agent SDK</strong>: Claude Code ka harness (files, bash, permissions, hooks).</li>
      <li><strong>Google ADK</strong>: workflow agents + A2A. <strong>MS Agent Framework</strong>: AutoGen ka successor. <strong>LlamaIndex</strong>: readers, nodes, index, query engine.</li>
      <li>Lock-in kam: tools MCP servers ki tarah, business logic framework se bahar. Tutorial ki date aur package version hamesha check karo.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: [
        'Loop, tool schema, state, retries jaisa plumbing ready: jaldi ship',
        'Checkpoints, HITL, multi-agent, streaming jaise mushkil features tested form mein',
        'Built-in tracing aur integrations (vector DBs, models, MCP)',
        'Team mein common vocabulary aur structure',
      ],
      costs: [
        'Abstraction ke peeche asli prompts/calls chhupte hain: debugging mushkil',
        'Fast-changing APIs (kai 0.x versions): upgrade ka kaam, purane tutorials galat',
        'Dependency weight aur lock-in; framework ke opinions tumhare design pe',
        'Simple kaam ke liye overkill: zyada code, zyada concepts',
      ] },

    { type: 'think', questions: [
      { q: 'xyz.com ka refund agent: refund ₹2,000 se upar ho to manager ka approval chahiye, jo kabhi kabhi agle din aata hai. Server beech mein restart bhi hote hain. Kaunsa framework/feature?', a: 'LangGraph (ya Microsoft Agent Framework workflows): interrupt() se graph ruke, state durable checkpointer (Postgres) mein save ho, agle din same thread_id + Command(resume=...) se wahin se chale. Refund tool idempotency key ke saath, taaki resume pe double refund na ho. In-memory checkpointer yahan nahi chalega kyunki restart pe sab ud jaayega.' },
      { q: 'Teammate kehta hai "CrewAI mein 5 agents bana dete hain: researcher, analyst, writer, reviewer, manager". Task hai order status batana. Kya bologe?', a: 'Overkill. Ye ek tool call wala kaam hai: ek agent ya ek simple workflow kaafi. 5 agents = kai LLM calls, zyada latency/cost aur delegation loops ka risk. Multi-agent tab jab kaam parallel ho ya ek context mein fit na ho. Pehle simplest version + eval, phir zarurat dikhe to agents badhao.' },
      { q: 'Tumne 2025 ka ek LangChain tutorial dekha jisme LLMChain aur initialize_agent use ho rahe hain. Aaj kya karoge?', a: 'LangChain 1.0 (Oct 2025) ke baad ye legacy APIs langchain-classic mein hain. Aaj ke liye create_agent (agents) ya LCEL/Runnables (simple chains) aur official docs ka current version dekho. General rule: framework tutorials ki date check karo, aur PyPI version + changelog dekho.' },
    ] },
    { type: 'quiz', questions: [
      { q: 'LangGraph mein human approval ke liye graph ko rokne ka tareeka?', options: ['time.sleep()', 'Node ke andar interrupt(), checkpointer ke saath; resume Command(resume=...) se', 'Exception throw karna', 'max_iter = 0'], answer: 1, explain: 'interrupt() pause karta hai, state checkpointer mein save hoti hai, aur same thread_id pe Command(resume=value) se aage chalta hai.' },
      { q: 'CrewAI mein Process.hierarchical ke liye kya zaroori hai?', options: ['Kam se kam 5 agents', 'manager_llm ya manager_agent', 'LangGraph checkpointer', 'Har task pe human_input=True'], answer: 1, explain: 'Hierarchical process mein ek manager tasks delegate aur review karta hai; uske liye manager_llm ya manager_agent dena padta hai.' },
      { q: 'LCEL mein "prompt | model | parser" ka kya matlab hai?', options: ['Teen parallel calls', 'Ek ka output agle ka input: ek Runnable sequence', 'Shell pipe', 'Teen alag agents'], answer: 1, explain: 'Pipe operator Runnables ko sequence mein jodta hai; poori chain bhi ek Runnable hai jisme invoke/stream/batch milte hain.' },
      { q: 'OpenAI Agents SDK mein handoff aur agent.as_tool() ka farak?', options: ['Koi farak nahi', 'Handoff mein control doosre agent ko chala jaata hai; as_tool mein caller agent control mein rehta hai', 'as_tool sirf OpenAI models ke liye', 'Handoff sirf guardrails ke saath chalta hai'], answer: 1, explain: 'Handoff = conversation transfer. Agent-as-tool = specialist ko tool ki tarah call karke result lena, control apne paas.' },
      { q: 'LangGraph state mein messages = [m1, m2] hai. Node {"messages": [m3]} lautata hai aur key pe add_messages reducer laga hai. Nayi state?', options: ['[m3]', '[m1, m2, m3]', '[m1, m2]', 'Error'], answer: 1, explain: 'add_messages reducer update ko purani list mein jodta hai. Bina reducer (default replace) ke [m3] bachta aur history mit jaati.' },
      { q: 'AutoGen ka current status (Oct 2026)?', options: ['Sabse naya Microsoft framework', 'Maintenance mode; successor Microsoft Agent Framework (1.0 GA April 2026)', 'LangChain mein merge ho gaya', 'Sirf .NET ke liye'], answer: 1, explain: 'AutoGen aur Semantic Kernel ki teams ne Microsoft Agent Framework banaya; dono purane projects ab maintenance mode mein.' },
      { q: 'Documents pe RAG agent ke liye sabse data-focused framework?', options: ['CrewAI', 'LlamaIndex', 'Claude Agent SDK', 'Google ADK'], answer: 1, explain: 'LlamaIndex ka core readers, nodes, indexes aur query engines hai, yaani data ko LLM ke liye ready karna.' },
    ] },
    { type: 'sources', note: 'Sab official docs 4 Oct 2026 ko padhe; versions PyPI JSON API se usi din. APIs tezi se badalti hain.', items: [
      { title: 'LangChain overview and v1 release notes', publisher: 'LangChain docs', url: 'https://docs.langchain.com/oss/python/langchain/overview', year: 2026, official: true, used: 'create_agent, init_chat_model, tools, middleware (HITL, Summarization, PII), langchain-classic split, agents built on LangGraph.' },
      { title: 'LangChain and LangGraph agent frameworks reach v1.0', publisher: 'LangChain blog', url: 'https://blog.langchain.com/langchain-langgraph-1dot0', year: 2025, official: true, used: 'October 2025 1.0 releases and positioning of each.' },
      { title: 'LangGraph overview, Graph API, interrupts', publisher: 'LangChain docs', url: 'https://docs.langchain.com/oss/python/langgraph/graph-api', year: 2026, official: true, used: 'StateGraph, reducers, conditional edges, Send, Command, checkpointer + thread_id, interrupt/Command(resume), __interrupt__.' },
      { title: 'CrewAI docs: Crews, Processes, Flows, Memory', publisher: 'CrewAI', url: 'https://docs.crewai.com/en/concepts/crews', year: 2026, official: true, used: 'Agent/Task/Crew attributes, sequential vs hierarchical (manager_llm/manager_agent), Flow decorators, @persist, unified Memory with LanceDB, YAML/@CrewBase.' },
      { title: 'OpenAI Agents SDK docs (handoffs, guardrails)', publisher: 'OpenAI', url: 'https://openai.github.io/openai-agents-python/', year: 2026, official: true, used: 'Agent, Runner, function_tool, handoffs vs as_tool, input/output/tool guardrails, parallel vs blocking, sessions, tracing, human-in-the-loop (tools needing approval, RunState pause/resume).' },
      { title: 'Claude Agent SDK overview, quickstart, custom tools', publisher: 'Anthropic', url: 'https://code.claude.com/docs/en/agent-sdk/overview', year: 2026, official: true, used: 'query(), ClaudeAgentOptions, built-in tools, permission modes, hooks, sub-agents, sessions, @tool + create_sdk_mcp_server.' },
      { title: 'Agent Development Kit docs', publisher: 'Google', url: 'https://adk.dev/', year: 2026, official: true, used: 'Agent, Sequential/Parallel/Loop agents, graph workflows in 2.0, tools, sessions, A2A, supported languages.' },
      { title: 'Microsoft Agent Framework overview and tools', publisher: 'Microsoft Learn', url: 'https://learn.microsoft.com/en-us/agent-framework/overview/', year: 2026, official: true, used: 'Successor to AutoGen + Semantic Kernel, agents, workflows, Harness Agent, sessions, middleware, tool approval, as_agent/as_tool code shape.' },
      { title: 'Microsoft ships Agent Framework 1.0', publisher: 'Techstrong.ai', url: 'https://techstrong.ai/features/microsoft-ships-agent-framework-1-0-a-production-ready-foundation-for-multi-agent-ai/', year: 2026, used: 'GA in April 2026; AutoGen and Semantic Kernel in maintenance mode (secondary source).' },
      { title: 'LlamaIndex framework docs and starter example', publisher: 'LlamaIndex', url: 'https://developers.llamaindex.ai/python/framework/', year: 2026, official: true, used: 'Readers, VectorStoreIndex, query engine, FunctionAgent, Workflows, LlamaParse.' },
      { title: 'Building effective agents', publisher: 'Anthropic Engineering', url: 'https://www.anthropic.com/engineering/building-effective-agents', year: 2024, official: true, used: 'Advice to start with LLM APIs directly and understand what frameworks do underneath.' },
      { title: 'PyPI JSON API (package versions)', publisher: 'Python Package Index', url: 'https://pypi.org/', year: 2026, official: true, used: 'Latest versions of all listed packages on 4 Oct 2026.' },
    ] },
  ],
});
