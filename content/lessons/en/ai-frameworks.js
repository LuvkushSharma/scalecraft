/*
  ai-frameworks (English twin). Same blocks, same widgets, same numbers as the Hinglish lesson.
  Versions read from PyPI + official docs on 4 Oct 2026.
*/
Lesson.register({
  id: 'ai-frameworks',
  title: 'LangChain, LangGraph, CrewAI and more',
  minutes: 42,
  summary: `You have learned to write the agent loop by hand. Now the frameworks: LangChain, LangGraph, CrewAI, OpenAI Agents SDK, Claude Agent SDK, Google ADK, Microsoft Agent Framework and LlamaIndex. For each one: the core ideas, a small piece of code, when to use it and when not to, plus the "no framework" option too.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Every time you build an agent, some jobs are the same: call the model, run a tool, remember the conversation, restart from the same place after a crash, wait for a person to say "yes".<br>If every team writes all this again and again, time is lost and bugs creep in. A <strong>framework</strong> gives you these common jobs ready-made, like a ready toolkit for building a website.<br>In this lesson you will understand 8 popular frameworks through one single job (telling an xyz.com user their order status): each one's mental model, a small piece of code, when to use it and when not to. And one direct question too: do you even need a framework?` },
    { type: 'h2', text: 'Problem: why write the loop again every time?' },
    { type: 'p', html: `In the <a href="#/ai-harness">harness lesson</a> we wrote xyz Assistant's loop ourselves: call the model, if a tool call comes then run it, send the result back, stop at max turns. In the <a href="#/ai-agent-patterns">patterns lesson</a> we also needed multi-agent, human approval, guardrails and tracing.` },
    { type: 'p', html: `Now three teams at xyz.com are building three different things: a support agent, a help-docs search (<a href="#/ai-rag">RAG</a>), and an internal coding agent. Every team is writing the same plumbing again: building tool schemas, handling history, resuming after a crash, pausing for approval, traces. This is exactly the job of <strong>frameworks</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Agent framework', html: `<strong>What it is:</strong> a library (code written in advance) that gives you the common parts of building an agent ready-made: one standard way to call a model (for any provider), building a tool schema from a Python function, the agent loop, state/memory, resuming after a crash (checkpoints), human-in-the-loop, multi-agent, and tracing. You write only your own logic (prompts, tools, flow).<br><strong>Why we need it:</strong> this plumbing is the same in every project. One well-built, tested version helps everyone.<br><strong>Without it:</strong> every team writes the same 200-500 lines of plumbing, each with its own bugs.` },
    { type: 'callout', tone: 'term', title: 'New word: Abstraction', html: `<strong>What it is:</strong> an easy "button" on top of something hard. You write <code>agent.invoke("...")</code>; inside, the framework does 10 jobs (building the prompt, the API call, running tools...). Think of a car's steering wheel: you do not have to go inside the engine.<br><strong>Why we need it:</strong> less code, faster work.<br><strong>Without it:</strong> you would handle every detail yourself.<br><strong>Careful:</strong> the real prompt and API calls hide behind the abstraction. When something goes wrong, seeing "what happened inside" is hard. This is the hidden cost of every framework.` },
    { type: 'table', head: ['What a framework gives', 'What you write without one', 'Lesson link'], rows: [
      ['Model abstraction', 'A different API format for every provider', '<a href="#/ai-what-is-llm">LLM</a>'],
      ['Tool schema from function', 'JSON schema by hand', '<a href="#/ai-agents">Agents</a>'],
      ['Agent loop + stop conditions', 'while loop, stop_reason check, max turns', '<a href="#/ai-harness">Harness</a>'],
      ['State, memory, checkpoints', 'Save/load history in a DB, resume logic', '<a href="#/ai-context">Context</a>'],
      ['Human-in-the-loop', 'Pause, save state, resume when approval comes', '<a href="#/ai-agent-patterns">Patterns</a>'],
      ['Multi-agent (handoff, crew, graph)', 'Routing and message passing between agents', '<a href="#/ai-agent-patterns">Patterns</a>'],
      ['Tracing', 'A log of every call, spans, a dashboard', '<a href="#/ai-agent-patterns">Patterns</a>'],
    ] },
    { type: 'callout', tone: 'warn', title: 'Frameworks change very fast', html: `This lesson was written on <strong>4 October 2026</strong> after reading the official docs and PyPI. The versions below are from that day. The code sketches are kept short to explain the idea (error handling, API keys and some imports are left out in places); in production, always read the official docs of that day. Model names (like <code>claude-sonnet-4-6</code>, <code>gemini-flash-latest</code>) are only examples.` },
    { type: 'table', caption: 'Latest Python package versions, checked on PyPI (the official public library of Python packages, where pip install gets them from) on 4 Oct 2026. A 0.x version means: the maker does not consider the API stable yet, so it can change.', head: ['Framework', 'Package', 'Version', 'Maker'], rows: [
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

    { type: 'h2', text: 'Option 0: no framework' },
    { type: 'callout', tone: 'term', title: 'New word: SDK', html: `<strong>What it is:</strong> Software Development Kit. A small library from a company that makes its service easy to use from code. For example the <code>anthropic</code> or <code>openai</code> Python package: you write <code>client.messages.create(...)</code>, and it builds and sends the HTTP request.<br><strong>Why we need it:</strong> you do not write raw HTTP, headers and retries yourself.<br><strong>Without it:</strong> JSON and HTTP by hand for every API call.<br><strong>Remember the difference:</strong> a provider SDK only gives "call the model". An agent framework adds the loop, state, multi-agent and so on on top of it.` },
    { type: 'p', html: `First the baseline: the model provider's own SDK + a 20-line loop. Anthropic's "Building effective agents" (Dec 2024) gives exactly this advice: start by using the LLM API directly; if you take a framework, understand what happens inside, because the real prompt and response hide behind the abstraction and debugging gets hard.` },
    { type: 'code', text: `# No framework: Anthropic Python SDK + your own loop
import anthropic
client = anthropic.Anthropic()

tools = [{
    "name": "get_order_status",
    "description": "Give the current status of an xyz.com order",
    "input_schema": {"type": "object",
                     "properties": {"order_id": {"type": "string"}},
                     "required": ["order_id"]},
}]
messages = [{"role": "user", "content": "Where is order 881?"}]

for turn in range(5):                                  # max turns
    resp = client.messages.create(model="claude-sonnet-4-6", max_tokens=1024,
                                  tools=tools, messages=messages)
    messages.append({"role": "assistant", "content": resp.content})
    if resp.stop_reason != "tool_use":                 # the model finished the job
        break
    results = [{"type": "tool_result", "tool_use_id": b.id,
                "content": get_order_status(**b.input)}   # YOUR code runs the tool
               for b in resp.content if b.type == "tool_use"]
    messages.append({"role": "user", "content": results})

print(resp.content[-1].text)` },
    { type: 'p', html: `<strong>When it is right:</strong> one agent, a few tools, a simple flow; you want control over every byte; you want few dependencies. <strong>When it hurts:</strong> when you need crash-resume, waiting for approvals, multi-agent, a streaming UI and tracing all together; then you are slowly building your own framework.` },

    { type: 'h2', text: 'LangChain: building blocks + a ready agent' },
    { type: 'p', html: `LangChain is the oldest and biggest ecosystem (since 2022). In October 2025 <strong>LangChain 1.0</strong> arrived and the focus changed: the main thing is now <code>create_agent</code>, and old legacy parts like the original "chains" moved into the <code>langchain-classic</code> package. The building blocks (messages, prompts, runnables, tools) live in <code>langchain-core</code>. LangChain's agents run on LangGraph underneath.` },
    { type: 'callout', tone: 'term', title: 'New word: Chain', html: `<strong>What it is:</strong> joining a few steps in a fixed line, where the output of one is the input of the next: build the prompt → send it to the model → clean up the answer. This is where LangChain got its name. It is the same idea as <a href="#/ai-agent-patterns">prompt chaining</a>, in code.<br><strong>Why we need it:</strong> so you do not write the same "fill the template, call the API, pull out the text" code every time.<br><strong>Without it:</strong> copy-pasted glue code everywhere.<br><strong>Careful:</strong> in a chain the model does not choose the path (it is a workflow, not an agent).` },
    { type: 'h3', text: 'Core concepts' },
    { type: 'list', items: [
      `<strong>Chat models</strong>: one interface like <code>init_chat_model("anthropic:claude-sonnet-4-6")</code>; change the provider and the rest of the code stays the same. <code>.invoke()</code>, <code>.stream()</code>, <code>.batch()</code>, <code>.bind_tools()</code>, <code>.with_structured_output()</code>.`,
      `<strong>Messages</strong>: SystemMessage, HumanMessage, AIMessage, ToolMessage. In v1, <code>content_blocks</code> puts every provider's reasoning/citations into one format.`,
      `<strong>Prompt templates</strong>: <code>ChatPromptTemplate</code> with <code>{variable}</code> placeholders, so the prompt stays separate from the code.`,
      `<strong>Runnables and LCEL</strong>: every component (prompt, model, parser, retriever) is a <em>Runnable</em> with the same methods: invoke, stream, batch, and async versions. In <strong>LCEL</strong> (LangChain Expression Language) you join them with the <code>|</code> pipe: the output of one is the input of the next. <code>RunnableParallel</code> runs several things on one input together.`,
      `<strong>Tools</strong>: the <code>@tool</code> decorator; the schema is built from the function's name, type hints and docstring.`,
      `<strong>Retrievers</strong>: the "give a query, get relevant documents" interface. From a vector store: <code>vector_store.as_retriever(search_kwargs={"k": 4})</code>. This is the retrieval step of RAG.`,
      `<strong>Agents</strong>: <code>create_agent(model, tools, system_prompt)</code> gives a ready-made tool-calling loop.`,
      `<strong>Middleware</strong> (new in v1): hooks at points in the loop, that is, places to plug in your own code. Built-in examples: <code>HumanInTheLoopMiddleware</code> (approval for a sensitive tool), <code>SummarizationMiddleware</code> (compacts long history), <code>PIIMiddleware</code> (redacts PII before it is sent to the model).`,
    ] },
    { type: 'callout', tone: 'term', title: 'New word: Middleware', html: `<strong>What it is:</strong> a small piece of code placed inside the agent loop that runs before/after every model call or tool call. Think of the security check at an airport: every passenger (every call) passes through it.<br><strong>Why we need it:</strong> jobs like approval, removing PII and shortening long history are needed in every agent; with middleware they plug in with one line.<br><strong>Without it:</strong> you would have to push these checks into the agent loop by hand.<br><strong>Example:</strong> below, <code>HumanInTheLoopMiddleware</code>: the agent stops on a <code>refund</code> call, but not on <code>get_order_status</code>.` },
    { type: 'callout', tone: 'term', title: 'New words: Runnable and LCEL', html: `<strong>What it is:</strong> a <strong>Runnable</strong> = LangChain's common "plug": anything that can run with <code>.invoke(input)</code> (prompt, model, parser, retriever). <strong>LCEL</strong> = the way to join them with <code>|</code> (a pipe). Think of Lego: every block has the same shape of socket underneath, so any block fits on any block.<br><strong>Why we need it:</strong> they all have the same shape, so joining is easy, and <code>.stream()</code>, <code>.batch()</code> and async come free for all.<br><strong>Without it:</strong> a different method name and different streaming code for every component.` },
    { type: 'p', html: `<strong>A small worked example</strong> (the chain below): input <code>{"doc": "Password reset: Settings > Security...", "question": "How do I change my password?"}</code> → the <strong>prompt</strong> builds 2 messages (system + human, with the doc and the question filled in) → the <strong>model</strong> returns an AIMessage → the <strong>StrOutputParser</strong> pulls out only the text: <code>"Go to Settings > Security and press Reset..."</code>. Three Runnables, one pipe, one string output.` },
    { type: 'code', text: `# LCEL: prompt | model | parser  (a simple chain, not an agent)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.chat_models import init_chat_model

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are xyz.com's support assistant. Answer in 2 lines."),
    ("human", "Help doc:\\n{doc}\\n\\nQuestion: {question}"),
])
model = init_chat_model("anthropic:claude-sonnet-4-6")
chain = prompt | model | StrOutputParser()

chain.invoke({"doc": "Password reset: Settings > Security...", "question": "How do I change my password?"})
# chain.stream(...) and chain.batch([...]) also work with no extra code` },
    { type: 'code', text: `# LangChain agent: create_agent + tool + human approval middleware
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain.tools import tool
from langgraph.checkpoint.memory import InMemorySaver

@tool
def refund(order_id: str, amount: int) -> str:
    """Start a refund for an order (amount in rupees)."""
    return payments.refund(order_id, amount)

agent = create_agent(
    model="claude-sonnet-4-6",
    tools=[get_order_status, refund],
    system_prompt="You are xyz.com's support assistant.",
    middleware=[HumanInTheLoopMiddleware(interrupt_on={"refund": True,
                                                      "get_order_status": False})],
    checkpointer=InMemorySaver(),     # saving state is required for pause/resume
)
# the agent stops on a refund call; after a person decides:
# agent.invoke(Command(resume={"decisions": [{"type": "approve"}]}), config=config)` },
    { type: 'p', html: `<strong>When to use LangChain:</strong> you want a standard tool-calling agent quickly, you need to switch between several model providers, and you want a big ecosystem of integrations (vector stores, loaders). <strong>When not to:</strong> a whole dependency tree for a tiny job; or when the flow is very custom (then go straight to LangGraph).` },

    { type: 'h2', text: 'LangGraph: agent as a graph (state machine)' },
    { type: 'p', html: `LangGraph is the LangChain team's <strong>low-level</strong> framework (its 1.0 also came in October 2025). The idea: write your agent as a <strong>graph</strong>: boxes (nodes) that do work, arrows (edges) that say where to go next, and a shared <strong>state</strong> that all nodes read and write. Loops, branches, parallel work: all explicit.` },
    { type: 'callout', tone: 'term', title: 'New word: Graph (state machine)', html: `<strong>What it is:</strong> a map with boxes (jobs) and arrows (where to go next). A <strong>state machine</strong> = a system that moves from one condition (state) to another by fixed rules. Think of a metro map: stations and the lines between them; a train can only run on the lines.<br><strong>Why we need it:</strong> the agent's path (loop, branch, waiting for approval) is clearly visible in code, and the framework can stop and save at every station.<br><strong>Without it:</strong> everything hides in one big while loop with if-else; where to stop and where to resume is hard to understand.` },
    { type: 'callout', tone: 'term', title: 'New words: State, Node, Edge', html: `<strong>State</strong> (what it is): a shared dict that all nodes read and update, like a class's common whiteboard. Example: <code>{"messages": [...], "order_id": "881"}</code>. Without it, every function would need all the information passed in separately.<br><strong>Node</strong> (what it is): a normal Python function: take the state, return a small update. An LLM call, a tool run or simple code: all are nodes. Without nodes, the pieces of work are not visible separately.<br><strong>Edge</strong> (what it is): an arrow that says which node comes after a node. A fixed edge always goes to the same place; a <strong>conditional edge</strong> runs a function that looks at the state and chooses the path. Without edges, "what next" would hide inside every node.` },
    { type: 'callout', tone: 'term', title: 'New word: Reducer', html: `<strong>What it is:</strong> a rule that says <em>how</em> a node's update merges into the old state: replace the old value, or add to the list (append).<br><strong>Why we need it:</strong> if two nodes update the same key (for example both add messages), nothing should be lost.<br><strong>Without it:</strong> the second update would wipe out the first.<br><strong>Worked example:</strong> the state is <code>messages = [m1, m2]</code>. A node returns <code>{"messages": [m3]}</code>. With the default (replace) reducer: <code>[m3]</code> (the history is gone!). With the <code>add_messages</code> reducer: <code>[m1, m2, m3]</code>. That is why the messages key always gets an append reducer.` },
    { type: 'list', items: [
      `<strong>State</strong>: a <code>TypedDict</code> or Pydantic model. Each key can have a <strong>reducer</strong> that says how an update merges: replace by default; append with <code>Annotated[list, operator.add]</code>; <code>add_messages</code> for messages (it also removes duplicates by id). Ready-made: <code>MessagesState</code>.`,
      `<strong>Nodes</strong>: normal functions. An LLM call, a tool run, or simple code; all are nodes.`,
      `<strong>Edges</strong>: <code>add_edge("a", "b")</code> is fixed; <code>add_conditional_edges("a", router_fn)</code> is where a function looks at the state and picks the next node. <code>START</code> and <code>END</code> are special nodes.`,
      `<strong>Compile</strong>: <code>graph.compile(checkpointer=...)</code> builds a runnable app (invoke, stream).`,
      `<strong>Checkpointer + thread_id</strong>: the state is saved after every step. The same <code>thread_id</code> continues the conversation (memory), resumes from the same place after a crash (<strong>durable execution</strong>), and allows "time travel" debugging from an old checkpoint.`,
      `<strong>interrupt() + Command(resume=...)</strong>: <code>interrupt(payload)</code> inside a node pauses the graph; the result contains <code>__interrupt__</code>; later, <code>Command(resume=value)</code> continues from the same place. This is human-in-the-loop.`,
      `<strong>Send</strong>: N parallel tasks at runtime (map-reduce, orchestrator-workers). <strong>Command(goto=..., update=...)</strong>: a node can itself update the state and name the next node (for handoffs).`,
      `<strong>Streaming</strong>: each node's update, or the LLM tokens, live to the UI.`,
    ] },
    { type: 'callout', tone: 'term', title: 'New words: Checkpointer and thread_id', html: `<strong>What it is:</strong> the <strong>checkpointer</strong> is the part that saves a copy of the whole state after every <strong>super-step</strong> of the graph (one round in which one or more nodes ran): in memory (<code>InMemorySaver</code>, only for testing) or in a database (Postgres/SQLite). The <strong>thread_id</strong> = the name of one conversation (like <code>"user-42"</code>), so it is clear which saved state belongs to whom.<br><strong>Why we need it:</strong> (1) when the next message comes on the same thread_id, the old conversation is remembered (memory), (2) after a crash, work restarts from the same place (this is called <strong>durable execution</strong>), (3) you can go back to an old checkpoint to debug (time travel), (4) waiting for approval.<br><strong>Without it:</strong> the process stops = everything is forgotten.<br><strong>Example:</strong> in the happy path of the flow below, 3 super-steps (agent → tools → agent) = 3 checkpoints, all under <code>thread_id="user-42"</code>.` },
    { type: 'callout', tone: 'term', title: 'New word: Interrupt', html: `<strong>What it is:</strong> writing <code>interrupt(payload)</code> inside a node makes the graph <em>stop</em> right there. The state is saved in a checkpoint, and the app gets the payload in <code>__interrupt__</code> (like "approve a refund of ₹4,500?"). Later, send <code>Command(resume=value)</code> and the graph continues from there, with <code>interrupt()</code> returning that value.<br><strong>Why we need it:</strong> for <a href="#/ai-agent-patterns">human-in-the-loop</a>, without keeping a process awake for hours.<br><strong>Without it:</strong> <code>time.sleep()</code> or polling for the approval, and everything vanishes on a restart.<br><strong>Careful:</strong> on resume, that node runs again <em>from the start</em> (the interrupt line now gets the value). So do not put any side-effect (sending money, an email) before the interrupt.` },
    { type: 'code', text: `# LangGraph: model node + tools node + approval node, with a checkpointer
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
    ok = interrupt({"action": state["messages"][-1].tool_calls[0]})   # the graph pauses here
    return Command(goto="tools" if ok else "agent")   # (sketch: on reject, real code also adds a ToolMessage)

g = StateGraph(MessagesState)
g.add_node("agent", agent)
g.add_node("tools", ToolNode([get_order_status, refund]))
g.add_node("approve", approve)
g.add_edge(START, "agent")
g.add_conditional_edges("agent", route, ["tools", "approve", END])
g.add_edge("tools", "agent")
app = g.compile(checkpointer=InMemorySaver())   # production: Postgres/SQLite checkpointer

cfg = {"configurable": {"thread_id": "user-42"}}
app.invoke({"messages": [("user", "Refund order 881")]}, cfg)   # -> __interrupt__
app.invoke(Command(resume=True), cfg)                          # continues after approval` },

    { type: 'flow', height: 330, title: 'LangGraph: loop, interrupt and checkpoint',
      nodes: [
        { id: 'u', label: 'User / app', x: 75, y: 165, w: 120, kind: 'client', info: 'What it is: your app (xyz.com\'s backend) that invokes the graph with a thread_id. When an interrupt comes, it shows the approval UI.' },
        { id: 'ag', label: 'agent node', sub: 'LLM call', x: 265, y: 165, w: 140, kind: 'server', info: 'What it is: the node of the graph that sends messages to the model. The model gives either a final answer or a tool call. The conditional edge (the route function) decides the next node.' },
        { id: 'tl', label: 'tools node', sub: 'ToolNode', x: 475, y: 65, w: 150, kind: 'server', info: 'What it is: LangGraph\'s ready-made ToolNode. It runs the tool_calls of the last AI message and adds the ToolMessage results to the state. Then a fixed edge goes back to the agent node: this is the agent loop.' },
        { id: 'ap', label: 'approve node', sub: 'interrupt()', x: 475, y: 265, w: 150, kind: 'edge', info: 'What it is: the approval node placed before a risky tool (refund). interrupt() pauses the graph; the state is safe in a checkpoint; when the app sends Command(resume=...), it continues from there.' },
        { id: 'ck', label: 'Checkpointer', sub: 'per thread_id', x: 645, y: 165, w: 130, kind: 'data', info: 'What it is: the safe box for the state. After every super-step the whole state is saved (InMemorySaver for development; Postgres/SQLite for production). This is what makes memory, resume, time-travel and human-in-the-loop possible.' },
      ],
      edges: [{ a: 'u', b: 'ag' }, { a: 'ag', b: 'tl' }, { a: 'ag', b: 'ap' }, { a: 'ap', b: 'tl' }, { a: 'ag', b: 'ck', dashed: true }],
      scenarios: [
        { name: 'Happy path loop', steps: [
          { title: 'invoke', text: 'The app runs the graph with the user message and a <code>thread_id</code>. From START to the agent node.', go: 'u>ag', msg: 'app.invoke({"messages": [...]}, {"configurable": {"thread_id": "user-42"}})' },
          { title: 'Tool call → tools node', text: 'The model asked for <code>get_order_status</code>. route() returned "tools".', go: 'ag>tl', set: { ap: { state: 'dim' } } },
          { title: 'Back to the agent', text: 'The tool result was added to the state, and a fixed edge goes back to the agent. A checkpoint after every step.', go: ['res:tl>ag', 'evt:ag>ck'], after: { ck: { sub: '3 checkpoints' } } },
          { title: 'END', text: 'Now the model gave a final answer, tool_calls is empty, and route() returned END.', go: 'res:ag>u', msg: 'Your order #881 will be delivered tomorrow.' },
        ]},
        { name: 'Interrupt + resume', steps: [
          { title: 'Refund requested', text: 'The model asked for <code>refund(881, 4500)</code>. route() chose "approve".', go: 'u>ag>ap', set: { tl: { state: 'dim' } } },
          { title: 'interrupt()', text: 'The graph stopped. The state is in a checkpoint; the app got the <code>__interrupt__</code> payload. Even if the process shuts down, that is fine.', go: ['evt:ag>ck', 'res:ap>ag>u'], after: { ap: { state: 'warn', sub: 'PAUSED' } }, msg: '__interrupt__: {"action": {"name": "refund", "args": {...}}}' },
          { title: 'Hours later: resume', text: 'Support staff approved. The app sends <code>Command(resume=True)</code> with the same thread_id; the graph loads the state from the checkpoint and continues from the approve node.', go: ['u>ag', 'ag>ap', 'ap>tl'], set: { tl: { state: '' } }, after: { ap: { state: 'ok', sub: 'approved' }, tl: { state: 'ok', sub: 'refunded' } }, msg: 'app.invoke(Command(resume=True), cfg)' },
          { title: 'Final reply', text: 'After the tools, the agent confirms and reaches END.', go: ['res:tl>ag', 'res:ag>u'] },
        ]},
        { name: 'Resume after a crash', steps: [
          { title: 'Crash in the middle', text: 'After the tool step, the server restarted (a new deploy, or OOM, which means out of memory).', go: 'u>ag>tl', after: { ag: { state: 'down', sub: 'process died' } } },
          { title: 'Without a checkpointer?', text: 'All the work is lost; the user must be asked again, and the tool (like a refund) may run again: a double refund!', focus: ['tl'], set: { tl: { state: 'warn', sub: 'repeat risk' } } },
          { title: 'With a checkpointer', text: 'The new process invokes with the same thread_id; the last checkpoint (with the tool result) is loaded and work continues from there. Still make tools with side-effects <strong>idempotent</strong>: running again has the effect only once (for example, send an idempotency key with the refund; if the same key comes a second time, the payments system ignores it), because a crash can also happen in the middle of a tool.', go: ['res:ck>ag', 'res:ag>u'], set: { ag: { state: 'ok', sub: 'resumed' }, tl: { state: '' } } },
        ]},
      ],
    },
    { type: 'p', html: `<strong>When to use LangGraph:</strong> custom control flow (branches, loops, parallel), long-running or durable agents, human approval that may come hours later, multi-agent graphs. <strong>When not to:</strong> a simple chatbot or a one-tool agent: the graph boilerplate will feel useless; there use <code>create_agent</code> (which is LangGraph inside) or no framework.` },

    { type: 'h2', text: 'CrewAI: a team of agents, with roles' },
    { type: 'p', html: `CrewAI's mental model is a <strong>team</strong>: each agent has a role, a goal and a backstory; the work is split into <strong>tasks</strong>; the team is a <strong>crew</strong>; and the order of the work is the <strong>process</strong>. On top of that sit <strong>Flows</strong>: an event-driven workflow layer with state. The CrewAI docs themselves say: for a production app, start with a Flow, and run a Crew inside a step of the Flow where you need autonomy. It is not built on LangChain; it is standalone.` },
    { type: 'callout', tone: 'term', title: 'New words: Agent, Task, Crew (in CrewAI)', html: `<strong>Agent</strong> (what it is): a "team member" with a written <code>role</code> (who it is), <code>goal</code> (what it wants) and <code>backstory</code> (a little background), plus some tools. CrewAI builds that agent's prompt from these three by itself.<br><strong>Task</strong> (what it is): a job card: <code>description</code> (what to do) + <code>expected_output</code> (what the result should look like) + which agent will do it.<br><strong>Crew</strong> (what it is): the team of agents + tasks, which starts work with <code>kickoff()</code>.<br><strong>Why we need it:</strong> thinking of work in roles like "researcher, writer, reviewer" is natural for people; fill in roles instead of writing prompts.<br><strong>Without it:</strong> you write a long system prompt for every agent and the code that passes output between them.` },
    { type: 'callout', tone: 'term', title: 'New word: Process (sequential vs hierarchical)', html: `<strong>What it is:</strong> the rule for the order of the crew's tasks and who hands them out. <strong>Sequential</strong>: tasks in list order, the output of one is the context of the next. <strong>Hierarchical</strong>: a manager agent (you must give a <code>manager_llm</code> or <code>manager_agent</code>) decides which task goes to whom, reviews the output, and sends it back if needed.<br><strong>Why we need it:</strong> some jobs are fine in a fixed order; others need a "boss" to judge.<br><strong>Without it:</strong> you would write the order and delegation logic yourself.<br><strong>Worked example (rough estimate):</strong> 2 tasks (research, reply). Sequential: the Researcher's work, then the Writer's; no extra calls. Hierarchical: the manager's calls on top: plan, 2 reviews, final answer = about 4 extra LLM calls in this small example. You get flexibility, but the bill and the time go up.` },
    { type: 'callout', tone: 'term', title: 'New word: Flow (CrewAI Flows)', html: `<strong>What it is:</strong> a Python class whose methods carry decorators: <code>@start()</code> (begin), <code>@listen(x)</code> (run when x finishes), <code>@router(x)</code> (return a string to pick a path). All methods share one typed <code>state</code>. It is a fixed workflow (code decides), and inside any step you can run a crew (agents).<br><strong>Why we need it:</strong> in production, most of the path should be predictable; autonomy only where it is needed.<br><strong>Without it:</strong> the full crew would run for every question, even one as simple as "how do I change my password".` },
    { type: 'h3', text: 'Core concepts' },
    { type: 'list', items: [
      `<strong>Agent</strong>: <code>role</code> (who it is), <code>goal</code> (what it wants), <code>backstory</code> (context/personality), <code>tools</code>, <code>llm</code>. Optional: <code>allow_delegation</code>, <code>max_iter</code> (loop limit), memory, knowledge.`,
      `<strong>Task</strong>: <code>description</code> (what to do, with <code>{placeholders}</code>), <code>expected_output</code> (what the output should look like), <code>agent</code>, <code>context</code> (which earlier tasks' output it needs), optional <code>output_pydantic</code>/<code>output_json</code>, <code>guardrail</code>, <code>human_input</code>.`,
      `<strong>Crew</strong>: agents + tasks + process. It runs with <code>crew.kickoff(inputs={...})</code>. Options: <code>memory</code>, <code>planning</code> (a planner first makes a step-by-step plan), <code>verbose</code>.`,
      `<strong>Process</strong>: <code>Process.sequential</code> (tasks in list order, the previous output is the next task's context) or <code>Process.hierarchical</code> (a manager, from <code>manager_llm</code> or <code>manager_agent</code>, hands out tasks and reviews the output).`,
      `<strong>Tools</strong>: the <code>@tool</code> decorator (<code>crewai.tools</code>) or a <code>BaseTool</code> class; ready tools in the <code>crewai_tools</code> package (search, scrape, files...). MCP servers too.`,
      `<strong>Flows</strong>: a class with decorators on methods: <code>@start()</code> is the entry, <code>@listen(method)</code> runs when that method finishes, <code>@router(method)</code> returns a string to choose a branch; combine with <code>or_</code>/<code>and_</code>. Typed state (Pydantic) lives in <code>self.state</code>. <code>@persist</code> saves the state in SQLite; there is also a decorator for human feedback.`,
      `<strong>Memory</strong>: the current docs have one <strong>unified Memory class</strong> (in place of the older separate short-term/long-term/entity memory types). When storing, an LLM decides scope/category/importance; recall is ranked by meaning + recency + importance. Default storage is LanceDB (a small local vector database, folder <code>./.crewai/memory</code>), and an embedder model is needed to make embeddings (number-vectors of the meaning of text, <a href="#/ai-tokenization">tokenization lesson</a>). Turn it on with <code>Crew(memory=True)</code>.`,
      `<strong>Knowledge</strong>: giving an agent or crew documents (PDF, text, CSV) to retrieve from, like RAG.`,
      `<strong>Config style</strong>: small examples in Python; big projects use <code>agents.yaml</code> + <code>tasks.yaml</code> and a <code>@CrewBase</code> class (the CLI <code>crewai create crew</code> builds this structure).`,
    ] },
    { type: 'code', text: `# CrewAI: two agents, sequential process
from crewai import Agent, Task, Crew, Process

researcher = Agent(role="xyz.com Support Researcher",
                   goal="Find the real cause of the user's issue",
                   backstory="You are an expert at reading orders and video logs.",
                   tools=[get_order_status, get_playback_errors])
writer = Agent(role="Support Reply Writer",
               goal="Write a polite, short, correct reply",
               backstory="You know xyz.com's brand voice.")

find = Task(description="Understand the issue: {question}",
            expected_output="3 bullets: what happened, why, what to do",
            agent=researcher)
reply = Task(description="Write a reply to the user from the findings",
             expected_output="A reply of at most 4 lines",
             agent=writer, context=[find])          # the output of find is the input here

crew = Crew(agents=[researcher, writer], tasks=[find, reply],
            process=Process.sequential, memory=True)
print(crew.kickoff(inputs={"question": "Why is the premium video not playing?"}))` },
    { type: 'code', text: `# CrewAI Flow: the router sends simple questions down a cheap path, complex ones to the crew
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
        self.state.answer = faq_lookup(self.state.question)    # without the crew

    @listen("complex")
    def run_crew(self):
        self.state.answer = str(crew.kickoff(inputs={"question": self.state.question}))

SupportFlow().kickoff(inputs={"question": "How do I reset my password?"})` },

    { type: 'flow', height: 330, title: 'CrewAI: Flow, Crew and process',
      nodes: [
        { id: 'fl', label: 'SupportFlow', sub: 'state, router', x: 85, y: 165, w: 140, kind: 'queue', info: 'What it is: a CrewAI Flow, an event-driven workflow with a typed state. Its @router decides whether a question needs the crew or not. The Flow is deterministic: code decides which method runs when.' },
        { id: 'mg', label: 'Crew/Manager', sub: 'process', x: 285, y: 165, w: 140, kind: 'server', info: 'What it is: the Crew object that runs the tasks on kickoff(). In the hierarchical process there is also a manager agent here (from manager_llm or manager_agent): it gives tasks to the right agent, reviews the output, and sends it back if needed. In the sequential process there is no manager; tasks run in list order.' },
        { id: 'rs', label: 'Researcher', sub: 'role + tools', x: 490, y: 65, w: 150, kind: 'server', info: 'What it is: the researching agent: Agent(role, goal, backstory, tools). With the orders and playback tools, it finds the cause of the issue.' },
        { id: 'wr', label: 'Writer', sub: 'role, no tools', x: 490, y: 265, w: 150, kind: 'server', info: 'What it is: the writing agent that writes the reply for the user from the researcher\'s findings (the task context). It has no tools: only as much permission as the job needs (least privilege).' },
        { id: 'mem', label: 'Memory', sub: 'LanceDB', x: 655, y: 165, w: 100, kind: 'data', info: 'What it is: the crew\'s shared memory (the unified Memory class). It remembers useful points from past conversations. Embeddings + LanceDB storage by default.' },
      ],
      edges: [{ a: 'fl', b: 'mg' }, { a: 'mg', b: 'rs' }, { a: 'mg', b: 'wr' }, { a: 'rs', b: 'wr' }, { a: 'rs', b: 'mem', dashed: true }, { a: 'wr', b: 'mem', dashed: true }],
      scenarios: [
        { name: 'Sequential crew', steps: [
          { title: 'Flow → crew', text: 'The router chose "complex", and the flow calls crew.kickoff(). In the sequential process there is no manager: the crew runs the tasks in list order.', go: 'fl>mg', after: { mg: { sub: 'sequential' } } },
          { title: 'Task 1: research', text: 'The Researcher does the first task, gets data with tools, and also earlier context from memory.', go: ['mg>rs', 'evt:rs>mem'], after: { rs: { state: 'ok', sub: 'findings ready' } } },
          { title: 'Task 2: reply (context)', text: 'The Researcher\'s output goes into the Writer\'s task through <code>context=[find]</code>.', go: 'rs>wr', msg: 'context: "subscription expired on 1 Oct, send the renew link"' },
          { title: 'Final output', text: 'The last task\'s output is the crew\'s result; it is saved in the flow state.', go: 'res:wr>mg>fl', after: { wr: { state: 'ok', sub: 'reply done' }, fl: { sub: 'answer saved' } } },
        ]},
        { name: 'Hierarchical', steps: [
          { title: 'Manager in charge', text: '<code>process=Process.hierarchical</code> + <code>manager_llm</code>. Tasks are not pre-assigned to any agent; the manager decides.', go: 'fl>mg', after: { mg: { state: 'hot', sub: 'manager planning' } } },
          { title: 'Delegate', text: 'The manager gives the research to the Researcher.', go: ['mg>rs', 'res:rs>mg'] },
          { title: 'Review and delegate', text: 'The manager checks the output, then gives the writing to the Writer.', go: ['mg>wr', 'res:wr>mg'] },
          { title: 'Validate', text: 'The manager validates the final answer and returns it to the flow. Gain: flexible. Cost: the manager\'s extra LLM calls and a less predictable path.', go: 'res:mg>fl', after: { mg: { state: 'ok', sub: 'done' } } },
        ]},
        { name: 'Simple question: skip the crew', steps: [
          { title: 'Router: "faq"', text: '"How do I reset my password?" The router returned "faq". The crew does not run at all: 0 agent calls.', set: { mg: { state: 'dim' }, rs: { state: 'dim' }, wr: { state: 'dim' } }, after: { fl: { state: 'ok', sub: 'faq path' } }, focus: ['fl'] },
          { title: 'Why this matters', text: 'This is the <a href="#/ai-agent-patterns">routing pattern</a>. Running the full crew on every question costs the LLM calls of 2-3 agents.', focus: ['fl'] },
        ]},
        { name: 'Delegation loop', steps: [
          { title: 'Ping-pong', text: 'In hierarchical mode, with vague instructions, the manager and the agents keep sending work back and forth.', go: ['mg>rs', 'res:rs>mg', 'mg>rs', 'res:rs>mg'], after: { mg: { state: 'warn', sub: 'iter 9...' } } },
          { title: 'Limit', text: 'The agent\'s <code>max_iter</code> (and the crew/agent rate limits) stop the loop; you get a best-effort answer. Fix: a clear <code>expected_output</code>, fewer agents, or the sequential process.', go: 'res:mg>fl', after: { mg: { state: 'down', sub: 'stopped' } } },
        ]},
      ],
    },
    { type: 'p', html: `<strong>When to use CrewAI:</strong> the work naturally splits into "roles" (researcher, writer, reviewer), you want a quick multi-agent prototype, and you want a predictable outer workflow with Flows. <strong>When not to:</strong> one agent is enough; or you need very fine control over the prompt of every step (CrewAI builds the real prompt behind the role/backstory abstraction).` },

    { type: 'h2', text: 'OpenAI Agents SDK: small primitives' },
    { type: 'p', html: `OpenAI's lightweight Python (and TypeScript) SDK, released in March 2025. Its version is still 0.x (0.23.1), which means the API can change. Few concepts, mostly plain Python: <strong>Agent</strong> (instructions + tools), <strong>Runner</strong> (runs the loop), <strong>function_tool</strong> (a tool from a function), <strong>handoffs</strong>, <strong>guardrails</strong>, <strong>sessions</strong> (history memory), and built-in <strong>tracing</strong>. It can run models from other providers too.` },
    { type: 'callout', tone: 'term', title: 'New words: Agent, Runner, function_tool (OpenAI SDK)', html: `<strong>Agent</strong> (what it is): an object with a name, instructions (system prompt), tools and handoffs. Only "who it is and what it can do".<br><strong>Runner</strong> (what it is): the thing that <em>runs</em> the agent: the loop, tool calls, handoffs, guardrails, until a final output comes or max turns is reached.<br><strong>function_tool</strong> (what it is): a decorator that turns a normal Python function into a tool; the JSON schema is built from its name, type hints and docstring.<br><strong>Why we need it:</strong> the agent's "definition" and its "running" are kept apart; learn only 3 things and start working.<br><strong>Without it:</strong> the same no-framework loop and schema by hand.` },
    { type: 'callout', tone: 'term', title: 'New words: Tripwire and Session', html: `<strong>Tripwire</strong> (what it is): the "alarm wire" of a guardrail. If the guardrail function returns <code>tripwire_triggered=True</code>, the Runner throws an exception right away and stops the run. Think of a door sensor that closes the gate on a wrong card.<br><strong>Why we need it:</strong> to stop the agent's work on a bad input before it goes further.<br><strong>Without it:</strong> you stop things yourself with if-else everywhere.<br><strong>Session</strong> (what it is): a store (like <code>SQLiteSession("user-42")</code>) that saves and loads the conversation history between turns by itself. Without it, you would add the earlier history yourself on every call.` },
    { type: 'list', items: [
      `<strong>Handoff</strong>: an agent hands the conversation to another agent (triage → billing). <strong>Agent as tool</strong> (<code>agent.as_tool()</code>): the lead agent calls a specialist like a tool and keeps control.`,
      `<strong>Guardrails</strong>: input guardrails (only on the first agent), output guardrails (only on the last agent), tool guardrails (on every function tool call). A guardrail's <code>tripwire_triggered=True</code> stops the run with an exception. By default the input guardrail runs <em>in parallel</em> with the agent (lower latency, but some tokens/tools may run before the tripwire fires); in blocking mode, the guardrail runs first and then the agent.`,
      `<strong>Sessions</strong>: like <code>SQLiteSession("user-42")</code>, history between turns handled automatically.`,
      `<strong>Human-in-the-loop</strong>: mark a tool as "needs approval"; the run stops at that call and returns an interruption. The paused run can be saved (serialized) as a <code>RunState</code> and resumed later with an approve/reject.`,
      `<strong>Tracing</strong>: on by default; every LLM call, tool, handoff and guardrail is a span.`,
    ] },
    { type: 'code', text: `# OpenAI Agents SDK: triage + handoffs + input guardrail
from agents import (Agent, Runner, function_tool, input_guardrail,
                    GuardrailFunctionOutput, SQLiteSession)

@function_tool
def get_order_status(order_id: str) -> str:
    """Give the current status of an xyz.com order."""
    return orders_api.status(order_id)

@input_guardrail
async def no_injection(ctx, agent, user_input):
    flagged = looks_like_injection(user_input)         # a small classifier or rules
    return GuardrailFunctionOutput(output_info=None, tripwire_triggered=flagged)

orders = Agent(name="Orders", instructions="Order and refund questions.", tools=[get_order_status])
video  = Agent(name="Video", instructions="Playback problems.", tools=[get_playback_errors])
triage = Agent(name="Triage", instructions="Hand off to the right specialist.",
               handoffs=[orders, video], input_guardrails=[no_injection])

result = Runner.run_sync(triage, "Where is order 881?", session=SQLiteSession("user-42"))
print(result.final_output)` },
    { type: 'p', html: `<strong>Worked example (parallel vs blocking guardrail):</strong> say the guardrail check takes 0.5 seconds and the agent's first model call takes 2 seconds. In the default (parallel) mode both start together: a safe input gets its answer in about 2 seconds; but on an injection, the tripwire fires at 0.5 seconds, and by then the agent's model call has already started (some tokens are spent). In blocking mode the guardrail runs first (0.5s), then the agent (2s): every request takes about 2.5 seconds, but on an injection the agent spends not a single token. Fast vs cheap-and-safe: you choose.` },
    { type: 'p', html: `<strong>When to use the OpenAI Agents SDK:</strong> you want one or a few agents, handoffs and guardrails with little code, tracing with no setup, and your team should learn few concepts. <strong>When not to:</strong> when the flow has many branches, loops and parallel steps that you want to see as one explicit graph, with checkpoints/time-travel at every step (LangGraph fits better there); or when you need a stable 1.x API (this one is still 0.x).` },

    { type: 'h2', text: 'Claude Agent SDK: Claude Code as a library' },
    { type: 'p', html: `Anthropic's Agent SDK (Python + TypeScript) gives you the same harness that runs behind <strong>Claude Code</strong>: the agent loop, context management (compaction, which means making a short summary of old history when the context starts to fill), built-in tools (files Read/Write/Edit, Bash, Glob/Grep, WebSearch/WebFetch), permissions, hooks, sub-agents, MCP, sessions, and skills/memory from the project's <code>.claude/</code> folder. So you do not give it a loop, only a task and options. All the parts of the <a href="#/ai-harness">harness lesson</a> are ready here.` },
    { type: 'callout', tone: 'term', title: 'New words: Permission mode, Hook, MCP server', html: `<strong>Permission mode</strong> (what it is): a setting that says which jobs the agent may do without asking. For example <code>acceptEdits</code> = file edits are OK automatically, ask for the rest. Without it, you get either "allow?" for every tiny thing, or everything with no stop.<br><strong>Hook</strong> (what it is): your own function that runs on some event, like before every tool call (<code>PreToolUse</code>). In it you can block a command like <code>rm -rf</code> or write an audit log. It is code, not a prompt, so the model cannot "convince" it.<br><strong>MCP server</strong> (a reminder, <a href="#/ai-agents">agents lesson</a>): the standard way to provide tools. In the Claude Agent SDK, a custom tool joins through a small in-process MCP server, and its full name is <code>mcp__&lt;server&gt;__&lt;tool&gt;</code>.<br><strong>Why we need it:</strong> the agent gets power over files and the terminal; these three keep that power on a leash.` },
    { type: 'list', items: [
      `<strong>query()</strong>: an async iterator; every message (reasoning, tool call, tool result, final result) is streamed.`,
      `<strong>ClaudeAgentOptions</strong>: <code>allowed_tools</code> (tools that run without asking), <code>permission_mode</code> (like <code>acceptEdits</code>), <code>system_prompt</code>, <code>mcp_servers</code>, hooks, agents (sub-agents).`,
      `<strong>Custom tools</strong>: <code>@tool</code> + <code>create_sdk_mcp_server</code> make an in-process MCP server; the tool's full name is <code>mcp__server__tool</code>.`,
      `<strong>Hooks</strong>: your own code before/after a tool call (like blocking <code>rm -rf</code>, or an audit log).`,
      `<strong>Sub-agents</strong>: agents with a separate context for focused work (<a href="#/ai-agent-patterns">orchestrator pattern</a>).`,
    ] },
    { type: 'code', text: `# Claude Agent SDK: built-in tools + permissions, the SDK runs the loop
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Find and fix the crash bug in xyz.com's upload service",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Glob", "Grep"],   # auto-approve
            permission_mode="acceptEdits",
        ),
    ):
        print(message)

asyncio.run(main())` },
    { type: 'p', html: `<strong>When:</strong> the agent must work with files, the terminal and code (coding agents, ops automation, research that writes files), and you are using Claude models. <strong>When not to:</strong> you need another model provider, or just a simple chat + 2 tools (it will feel heavy).` },

    { type: 'h2', text: 'Google ADK (Agent Development Kit)' },
    { type: 'p', html: `Google's open-source framework (launched in April 2025; now at 2.x). Available in Python, TypeScript, Go, Java and Kotlin. Optimised for Gemini, but it can run other models too. Concepts:` },
    { type: 'callout', tone: 'term', title: 'New words: Workflow agent and A2A', html: `<strong>Workflow agent</strong> (what it is): an ADK "agent" that does not run an LLM itself; it only runs the agents inside it in a fixed way: <code>SequentialAgent</code> (one after another), <code>ParallelAgent</code> (at the same time), <code>LoopAgent</code> (again until a condition is met). These are the <a href="#/ai-agent-patterns">workflow patterns</a>, as ready classes.<br><strong>Why we need it:</strong> where the path is fixed, letting an LLM choose the path is wasted money and added risk.<br><strong>Without it:</strong> you write the order logic yourself, or ask an LLM to "now run finder, then writer".<br><strong>A2A</strong> (the Agent2Agent protocol, what it is): an open standard for agents of different systems/companies to talk to each other. Just as MCP connects an agent to tools, A2A connects an agent to <em>another agent</em>.` },
    { type: 'list', items: [
      `<strong>Agent / LlmAgent</strong>: model + instruction + tools.`,
      `<strong>Workflow agents</strong>: <code>SequentialAgent</code>, <code>ParallelAgent</code>, <code>LoopAgent</code>: deterministic orchestration without an LLM (the <a href="#/ai-agent-patterns">workflow patterns</a> directly as classes). ADK 2.0 also added graph-based workflows.`,
      `<strong>Multi-agent</strong>: a tree through <code>sub_agents</code>; agents can delegate to each other; the A2A protocol for remote agents.`,
      `<strong>Tools</strong>: Python functions, MCP tools, OpenAPI, built-ins like Google Search.`,
      `<strong>Sessions + state</strong> (SessionService), <strong>Runner</strong> (execution), plus a dev UI (<code>adk web</code>), a CLI (<code>adk run</code>) and evaluation tools.`,
    ] },
    { type: 'code', text: `# Google ADK: one agent + one sequential workflow
from google.adk.agents import Agent, SequentialAgent

def get_order_status(order_id: str) -> dict:
    """Give the current status of an xyz.com order."""
    return {"status": orders_api.status(order_id)}

finder = Agent(name="finder", model="gemini-flash-latest",
               instruction="Find the status of the order.", tools=[get_order_status],
               output_key="findings")                     # the result goes into state
writer = Agent(name="writer", model="gemini-flash-latest",
               instruction="Write a polite reply for the user from {findings}.")

root_agent = SequentialAgent(name="support", sub_agents=[finder, writer])
# run it: adk web  (dev UI)  or  Runner + InMemorySessionService` },
    { type: 'p', html: `<strong>Worked example:</strong> above, <code>finder</code> puts its answer in the state with <code>output_key="findings"</code>, like <code>state["findings"] = "Order 881: shipped, delivery tomorrow"</code>. Then <code>{findings}</code> in the <code>writer</code>'s instruction is filled with that value. The SequentialAgent decided the order, not an LLM.` },
    { type: 'p', html: `<strong>When to use Google ADK:</strong> you are on Gemini / Google Cloud (Vertex AI), your team also works in Java, Go or TypeScript, or you want a mix of workflow agents + LLM agents with a dev UI and eval tools in one place. <strong>When not to:</strong> your whole stack is on another cloud/provider and you use no part of Google; or a tiny single agent where the provider SDK is enough.` },

    { type: 'h2', text: 'AutoGen → Microsoft Agent Framework' },
    { type: 'p', html: `<strong>AutoGen</strong> (Microsoft Research, 2023) was a pioneer of multi-agent "conversations": agents chatted with each other to get work done (for example one AssistantAgent writes code, another runs it and gives feedback). <strong>Semantic Kernel</strong> was Microsoft's enterprise SDK. The two teams together built the <strong>Microsoft Agent Framework</strong>; its 1.0 became GA (General Availability, a release considered ready for production) in April 2026, and AutoGen + Semantic Kernel are now in maintenance mode (only bug/security fixes). For a new project, use the Agent Framework, not AutoGen.` },
    { type: 'callout', tone: 'term', title: 'New word: Maintenance mode', html: `<strong>What it is:</strong> when a piece of software is still "alive" but gets no new features; only bug and security fixes. Think of an old phone model that is no longer sold but still gets updates for a while.<br><strong>Why it matters:</strong> if you start a new project on such a framework, you will not get the features you need tomorrow (new models, new protocols).<br><strong>If you do not know this:</strong> you will start a new project from a 2023 AutoGen tutorial and have to migrate later.` },
    { type: 'list', items: [
      `<strong>Agents</strong>: a chat client (OpenAI, Azure/Foundry, Anthropic, Ollama...) + instructions + tools/MCP.`,
      `<strong>Sessions</strong> (state), <strong>context providers</strong> (memory), <strong>middleware</strong> (intercepts the agent's actions), tool approval (HITL), telemetry (OpenTelemetry).`,
      `<strong>Workflows</strong>: graph-based, explicit execution paths, multi-agent orchestration, with checkpointing and human-in-the-loop.`,
      `<strong>Harness Agent</strong>: a batteries-included agent for long jobs (planning/todos, context compaction, file memory, approvals).`,
      `Languages: .NET and Python (Go in preview). Smoothest with Azure/Foundry, but not limited to it.`,
    ] },
    { type: 'code', text: `# Microsoft Agent Framework (Python) sketch
from agent_framework.openai import OpenAIChatCompletionClient

agent = OpenAIChatCompletionClient(model="gpt-5.4-mini").as_agent(
    name="xyzSupport",
    instructions="You are xyz.com's support assistant.",
    tools=[get_order_status],
)
result = await agent.run("Where is order 881?")
print(result.text)` },
    { type: 'p', html: `<strong>When to use the Microsoft Agent Framework:</strong> a .NET or Python team, deployment on Azure/Foundry, enterprise needs (telemetry, approvals, graph workflows with checkpointing), or moving old AutoGen/Semantic Kernel code to the new framework. <strong>When not to:</strong> a small prototype that does not need so many enterprise features; or your team has already settled on another framework and does not use the Microsoft stack.` },
    { type: 'callout', tone: 'tip', title: 'Microsoft\'s own advice', html: `The Agent Framework docs have one direct line: if a task can be done by a normal function, write that function; do not build an AI agent. Use an agent for open-ended work and a workflow for clear steps.` },

    { type: 'h2', text: 'LlamaIndex: a focus on data and RAG' },
    { type: 'p', html: `LlamaIndex (since 2022, first called "GPT Index") focuses on <strong>your data</strong>: loading PDFs, docs and databases, splitting them, indexing them, and running queries/agents on them. A natural fit for xyz.com's help-docs search (<a href="#/ai-rag">RAG lesson</a>).` },
    { type: 'callout', tone: 'term', title: 'New words: Reader, Node, Index, Query engine', html: `<strong>Reader</strong> (what it is): a connector that brings data in. It reads text from a folder, PDF, Notion or S3 and makes <em>Documents</em>.<br><strong>Node</strong> (what it is): a small piece (chunk) of a document + metadata (which file, which page). This is a completely different thing from a LangGraph "node"; only the name is the same.<br><strong>Index</strong> (what it is): arranging nodes so that searching is fast. A <code>VectorStoreIndex</code> keeps an embedding (a number-vector of the meaning) for every node.<br><strong>Query engine</strong> (what it is): take a question → find the relevant nodes → have the LLM write an answer based on them. The whole <a href="#/ai-rag">RAG</a> pipeline in one object.<br><strong>Why we need it:</strong> the 5-6 steps of RAG (load, chunk, embed, store, retrieve, answer) are the same in every project.<br><strong>Without it:</strong> you write the code for every step, and a separate parser for every data source.` },
    { type: 'list', items: [
      `<strong>Readers / data connectors</strong>: <code>SimpleDirectoryReader</code> and thousands of connectors (Notion, Slack, S3...). <strong>LlamaParse</strong>: parsing of hard PDFs, tables and scanned docs (hosted).`,
      `<strong>Documents → Nodes</strong>: the chunks of a document are called "nodes", with metadata.`,
      `<strong>Indexes</strong>: <code>VectorStoreIndex</code> (embeddings), plus summary/keyword/property-graph indexes. On any vector DB.`,
      `<strong>Query engine</strong> (one question → retrieve → answer) and <strong>chat engine</strong> (multi-turn).`,
      `<strong>Agents</strong>: <code>FunctionAgent</code>, and <code>AgentWorkflow</code> for multi-agent.`,
      `<strong>Workflows</strong>: event-driven steps (<code>@step</code> functions that take and emit events), branching, human review.`,
    ] },
    { type: 'code', text: `# LlamaIndex: an index of the help docs + an agent that uses it like a tool
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.agent.workflow import FunctionAgent

docs = SimpleDirectoryReader("xyz_help_docs").load_data()
index = VectorStoreIndex.from_documents(docs)        # chunk + embed + store
query_engine = index.as_query_engine()

async def search_help(query: str) -> str:
    """Find the answer in the xyz.com help docs."""
    return str(await query_engine.aquery(query))

agent = FunctionAgent(tools=[search_help, get_order_status], llm=llm,
                      system_prompt="You are xyz.com's support assistant.")
response = await agent.run("What is the download limit?")` },
    { type: 'p', html: `<strong>Worked example:</strong> xyz.com has 40 help docs. Each doc is split into about 5 pieces, so about 200 nodes, each with an embedding in the index. For the question "What is the download limit?", the query engine fetches the top-2 nodes (both from the "Downloads" page), and the LLM reads only these 2 pieces to write the answer. Only 2 of 200 pieces go into the prompt: fewer tokens, less hallucination.` },
    { type: 'p', html: `<strong>When to use LlamaIndex:</strong> the main job is answering questions over documents/data (PDFs, wikis, tables), you need to connect many data sources, or you must parse hard PDFs. <strong>When not to:</strong> there is no data, only an agent with tools and actions; or multi-agent orchestration is the main job (then take retrieval from LlamaIndex and orchestration from something else, or go straight to LangGraph/CrewAI).` },

    { type: 'h2', text: 'One job, different frameworks' },
    { type: 'p', html: `The task is the same: give xyz Assistant the <code>get_order_status</code> tool and ask "Where is order 881?". Switch tabs to see what the code looks like and what each framework gives for free. (The tool function <code>orders_api.status()</code> is assumed to be the same in all of them.)` },
    { type: 'custom', render(el) {
      const T = [
        { k: 'none', n: 'No framework', free: 'Nothing: the loop, stop condition, tool dispatch and history are all yours. In return: full control and zero magic.', code: `import anthropic
client = anthropic.Anthropic()
tools = [{"name": "get_order_status", "description": "Give the order status",
          "input_schema": {"type": "object", "required": ["order_id"],
                           "properties": {"order_id": {"type": "string"}}}}]
msgs = [{"role": "user", "content": "Where is order 881?"}]
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
        { k: 'lc', n: 'LangChain', free: 'Schema from the docstring, a ready loop, any provider model from one string, middleware (HITL, summarisation, PII).', code: `from langchain.agents import create_agent
from langchain.tools import tool

@tool
def get_order_status(order_id: str) -> str:
    """Give the order status."""
    return orders_api.status(order_id)

agent = create_agent(model="claude-sonnet-4-6", tools=[get_order_status],
                     system_prompt="You are the xyz.com support assistant.")
out = agent.invoke({"messages": [{"role": "user", "content": "Where is order 881?"}]})
print(out["messages"][-1].content)` },
        { k: 'lg', n: 'LangGraph', free: 'Every step explicit in a graph; memory, crash-resume and interrupts from the checkpointer. More code, more control.', code: `from langgraph.graph import StateGraph, MessagesState, START
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import InMemorySaver
from langchain.chat_models import init_chat_model
# get_order_status: the same @tool as in the LangChain tab

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
app.invoke({"messages": [("user", "Where is order 881?")]},
           {"configurable": {"thread_id": "user-42"}})` },
        { k: 'crew', n: 'CrewAI', free: 'The prompt is built from role/goal/backstory; tasks, expected_output, memory, and adding more agents later is easy.', code: `from crewai import Agent, Task, Crew
from crewai.tools import tool

@tool("Order status")
def get_order_status(order_id: str) -> str:
    """Give the order status."""
    return orders_api.status(order_id)

support = Agent(role="xyz.com Support Agent", goal="A correct answer to order questions",
                backstory="You have worked in xyz.com support for 3 years.",
                tools=[get_order_status])
task = Task(description="The user question: {question}",
            expected_output="A polite answer in 2 lines", agent=support)
print(Crew(agents=[support], tasks=[task]).kickoff(
    inputs={"question": "Where is order 881?"}))` },
        { k: 'oai', n: 'OpenAI Agents SDK', free: 'The least code; schema from type hints; tracing on; handoffs/guardrails/sessions one line away.', code: `from agents import Agent, Runner, function_tool

@function_tool
def get_order_status(order_id: str) -> str:
    """Give the order status."""
    return orders_api.status(order_id)

agent = Agent(name="xyz Support", instructions="You are the xyz.com support assistant.",
              tools=[get_order_status])
print(Runner.run_sync(agent, "Where is order 881?").final_output)` },
        { k: 'claude', n: 'Claude Agent SDK', free: 'The full Claude Code harness: built-in tools, permissions, hooks, compaction, sub-agents. A custom tool goes through an MCP server.', code: `from claude_agent_sdk import tool, create_sdk_mcp_server, ClaudeAgentOptions, query

@tool("get_order_status", "Give the order status", {"order_id": str})
async def get_order_status(args):
    return {"content": [{"type": "text", "text": orders_api.status(args["order_id"])}]}

xyz = create_sdk_mcp_server(name="xyz", version="1.0.0", tools=[get_order_status])
opts = ClaudeAgentOptions(mcp_servers={"xyz": xyz},
                          allowed_tools=["mcp__xyz__get_order_status"],
                          system_prompt="You are the xyz.com support assistant.")
async for msg in query(prompt="Where is order 881?", options=opts):
    print(msg)` },
      ];
      el.innerHTML = `<div class="chips fw-chips" role="group" aria-label="Framework"></div>
        <div class="stats"><div class="stat"><span>Code lines (without comments)</span><strong class="fw-lines"></strong></div><div class="stat"><span>Framework</span><strong class="fw-name"></strong></div></div>
        <pre class="code fw-code" style="max-height:420px;overflow:auto"></pre>
        <p class="calc-note fw-free"></p>`;
      const chips = el.querySelector('.fw-chips');
      const lines = c => c.split('\n').filter(l => l.trim() !== '' && !l.trim().startsWith('#')).length;
      function show(i) {
        [...chips.children].forEach((b, j) => b.classList.toggle('on', i === j));
        el.querySelector('.fw-code').textContent = T[i].code;
        el.querySelector('.fw-lines').textContent = lines(T[i].code);
        el.querySelector('.fw-name').textContent = T[i].n;
        el.querySelector('.fw-free').innerHTML = '<strong>You get for free:</strong> ' + T[i].free;
      }
      T.forEach((t, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = t.n; b.onclick = () => show(i); chips.appendChild(b); });
      show(0);
    } },

    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Fewer lines = a better framework" is wrong. The 8-line OpenAI SDK version and the 17-line no-framework version run the <em>same</em> loop inside. The difference is how much more code you will write later when you need approval, crash-resume and multi-agent, and how much is hidden from you when you debug.` },

    { type: 'h2', text: 'Pick your needs, get a framework' },
    { type: 'p', html: `Turn on the chips for your project's needs below. Each need gives each framework 0-3 points (this scoring is a rule of thumb based on this lesson's research, not an official ranking). The top 3 are shown, with the reason.` },
    { type: 'custom', render(el) {
      const F = { none: 'No framework', oai: 'OpenAI Agents SDK', lc: 'LangChain', lg: 'LangGraph', crew: 'CrewAI', claude: 'Claude Agent SDK', adk: 'Google ADK', maf: 'Microsoft Agent Framework', llama: 'LlamaIndex' };
      const ORDER = ['none', 'oai', 'lc', 'lg', 'crew', 'claude', 'adk', 'maf', 'llama'];
      const N = [
        ['simple', 'Simple: one agent, a few tools', { none: 3, oai: 3, lc: 2, adk: 2, claude: 1, maf: 1, crew: 1, llama: 1 }],
        ['flow', 'Custom flow: branch, loop, parallel', { lg: 3, maf: 2, adk: 2, crew: 2, llama: 2, none: 1 }],
        ['durable', 'Crash-resume, approval hours later', { lg: 3, maf: 2, crew: 1, claude: 1, adk: 1, llama: 1, oai: 1 }],
        ['team', 'Role-based team, quick prototype', { crew: 3, adk: 1, maf: 1, oai: 1, lg: 1 }],
        ['rag', 'RAG over docs/PDFs is the main job', { llama: 3, lc: 2, crew: 1, adk: 1, maf: 1 }],
        ['code', 'Work on files, terminal, code', { claude: 3, none: 1 }],
        ['handoff', 'Handoffs + guardrails, OpenAI models', { oai: 3, maf: 1, lg: 1, adk: 1 }],
        ['google', 'Gemini / Google Cloud, Java/Go', { adk: 3 }],
        ['dotnet', '.NET / Azure enterprise', { maf: 3 }],
        ['multi', 'Switching between model providers', { lc: 3, lg: 2, llama: 2, crew: 2, maf: 2, adk: 1, oai: 1 }],
        ['minimal', 'Few dependencies, full control', { none: 3, oai: 2 }],
      ];
      const WHY = { none: 'The model SDK directly + your own loop: the most transparent, the least magic.', oai: 'Few primitives (Agent, Runner, handoffs, guardrails), tracing built in.', lc: 'create_agent + middleware, the biggest integrations ecosystem, provider-agnostic models.', lg: 'Explicit graph, checkpoints, interrupts: durable and controllable agents.', crew: 'A team quickly from Agents/Tasks/Crew/Process; a predictable outer workflow from Flows.', claude: 'The Claude Code harness: files/bash tools, permissions, hooks, sub-agents.', adk: 'Gemini-first, Sequential/Parallel/Loop agents, 5 languages, A2A.', maf: 'The successor of AutoGen + Semantic Kernel: .NET/Python, workflows, Azure/Foundry.', llama: 'Loaders, indexes, query engines: for data-heavy RAG agents.' };
      el.innerHTML = `<div class="chips fr-chips" role="group" aria-label="Needs"></div><div class="fr-out" style="margin-top:10px"></div>`;
      const sel = new Set();
      const chips = el.querySelector('.fr-chips');
      N.forEach(([k, label]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = label; b.dataset.k = k;
        b.onclick = () => { sel.has(k) ? sel.delete(k) : sel.add(k); b.classList.toggle('on', sel.has(k)); draw(); }; chips.appendChild(b); });
      function draw() {
        const out = el.querySelector('.fr-out');
        if (!sel.size) { out.innerHTML = '<p class="calc-note">Nothing selected. Default: start with <strong>no framework</strong> or the simplest SDK, and change when a need appears.</p>'; return; }
        const sc = ORDER.map((f, i) => ({ f, i, s: N.filter(n => sel.has(n[0])).reduce((a, n) => a + (n[2][f] || 0), 0) }));
        sc.sort((a, b) => b.s - a.s || a.i - b.i);
        const top = sc.filter(x => x.s > 0).slice(0, 3);
        const max = top[0].s;
        out.innerHTML = top.map((x, r) => `<div style="border:1px solid var(--line);border-radius:var(--r);padding:8px 10px;margin:6px 0;background:${r === 0 ? 'var(--accent-soft)' : 'var(--surface)'}">
          <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><strong>${r + 1}. ${F[x.f]}</strong><span style="font-family:var(--f-mono);color:var(--ink-2)">${x.s} pts</span></div>
          <div style="height:6px;border-radius:3px;background:var(--accent);width:${(100 * x.s / max).toFixed(0)}%;margin:4px 0"></div>
          <div style="color:var(--ink-2);font-size:14px">${WHY[x.f]}</div></div>`).join('') +
          '<p class="calc-note">Remember: frameworks can also be mixed (like LlamaIndex retrieval + LangGraph orchestration). Make the final decision with a small prototype and an eval.</p>';
      }
      draw();
    } },

    { type: 'h2', text: 'Side-by-side comparison' },
    { type: 'table', head: ['Framework', 'Mental model', 'Multi-agent', 'State / HITL', 'Best at'], rows: [
      ['No framework', 'Your own while loop', 'Write it yourself', 'Write it yourself', 'Small, transparent agents'],
      ['LangChain', 'Building blocks + create_agent', 'Via LangGraph', 'Middleware (HITL), LangGraph checkpoints', 'A standard agent quickly, integrations'],
      ['LangGraph', 'State machine graph', 'Graph nodes, Send, Command', 'Checkpointer, interrupt/resume, time travel', 'Custom, durable, controllable flows'],
      ['CrewAI', 'Team: Agent, Task, Crew, Process', 'Sequential / hierarchical crews', 'Flows state + @persist, human feedback', 'Role-based teams, quick prototypes'],
      ['OpenAI Agents SDK', 'Agent + Runner', 'Handoffs, agents-as-tools', 'Sessions, tool approval + RunState resume, guardrail tripwires', 'Minimal code, built-in tracing'],
      ['Claude Agent SDK', 'Claude Code harness as library', 'Sub-agents', 'Sessions, permissions, hooks', 'Coding/file/terminal agents'],
      ['Google ADK', 'Agents + workflow agents', 'sub_agents tree, A2A', 'Sessions/state, graph workflows (2.x)', 'Gemini/GCP, many languages'],
      ['MS Agent Framework', 'Agents + graph workflows', 'Workflows, agent-as-tool', 'Sessions, checkpoints, tool approval', '.NET/Python enterprise, Azure'],
      ['LlamaIndex', 'Data → index → query', 'AgentWorkflow', 'Workflows (events, human review)', 'RAG over documents'],
    ] },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>First question: do you need a framework at all?</strong> One agent, a few tools, a simple flow → <strong>no framework</strong>, or a light option like the <strong>OpenAI Agents SDK</strong>/<strong>LangChain create_agent</strong>.<br><strong>The flow is custom, or you need crash-resume or approval hours later</strong> → <strong>LangGraph</strong> (or, on .NET/Azure, <strong>Microsoft Agent Framework</strong> workflows).<br><strong>The work splits into roles, a quick multi-agent demo</strong> → <strong>CrewAI</strong> (in production, a crew inside a Flow).<br><strong>The main job is RAG over documents</strong> → <strong>LlamaIndex</strong> (retrieval); orchestration can come from something else too.<br><strong>The agent must work with files/terminal/code</strong> → <strong>Claude Agent SDK</strong>.<br><strong>A Gemini/Google Cloud or Java/Go team</strong> → <strong>Google ADK</strong>.<br><strong>AutoGen</strong> is not for new projects (maintenance mode); take the Microsoft Agent Framework.<br>In every case: confirm with a small prototype + an <a href="#/ai-agent-patterns">eval set</a>.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Adding a framework will make my agent good." A framework gives plumbing, <strong>not quality</strong>. The agent's quality still comes from prompts, tool descriptions, context and evals. And print and read the framework's default prompts at least once (like the prompt CrewAI builds from role/backstory): what you cannot see, you cannot debug.` },
    { type: 'callout', tone: 'why', title: 'How to reduce lock-in', html: `<strong>Lock-in</strong> = getting so stuck in one framework that changing it becomes very expensive. Ways to avoid it: build tools as <strong>MCP servers</strong> (<a href="#/ai-agents">agents lesson</a>): almost every framework can use MCP tools, so you do not rewrite tools when you change frameworks. Keep business logic (orders_api) outside the framework; let the framework only do orchestration. Between agents in different systems, protocols like A2A are arriving.` },

    { type: 'h2', text: 'The whole picture: where each framework sits' },
    { type: 'p', html: `The map below is built on two questions. <strong>Left → right:</strong> who chooses the path? On the left, your code (more control); on the right, the model (more autonomy). <strong>Top → bottom:</strong> what kind of work is it? At the top, data/RAG or a single agent; at the bottom, a team of agents (multi-agent). The positions are a rough guide, not an official ranking: most frameworks can do something on both sides. Use the buttons to pick a family.` },
    { type: 'diagram', title: 'Map of frameworks: control vs autonomy, data vs team', height: 570,
      groups: [
        { label: 'More control · data / one agent', x: 10, y: 10, w: 345, h: 270 },
        { label: 'More autonomy · data / one agent', x: 365, y: 10, w: 345, h: 270 },
        { label: 'More control · multi-agent', x: 10, y: 290, w: 345, h: 270 },
        { label: 'More autonomy · multi-agent', x: 365, y: 290, w: 345, h: 270 },
      ],
      nodes: [
        { id: 'llama', label: 'LlamaIndex', sub: 'data → index → query', x: 190, y: 85, w: 160, kind: 'data', info: 'What it is: a data-first framework. Documents from readers, nodes (chunks), an index, a query engine. The path is mostly fixed (retrieve → answer), so it sits on the control side; it also has agents and workflows.' },
        { id: 'none', label: 'No framework', sub: 'your own loop', x: 120, y: 210, w: 140, kind: 'client', info: 'What it is: the provider\'s SDK + your own 20-line loop. The most control and transparency, no magic. For one agent with a few tools, often the best place to start.' },
        { id: 'lc', label: 'LangChain', sub: 'create_agent, RAG blocks', x: 470, y: 85, w: 180, kind: 'server', info: 'What it is: building blocks (models, prompts, retrievers, tools) + a ready agent loop (create_agent) + middleware. The model runs the loop, so it sits toward autonomy; its RAG blocks put it near the top.' },
        { id: 'claude', label: 'Claude Agent SDK', sub: 'files, bash, hooks', x: 610, y: 210, w: 170, kind: 'server', info: 'What it is: the Claude Code harness as a library. The agent itself reads and edits files and runs commands: a lot of autonomy, kept on a leash by permissions and hooks. It has sub-agents too, but the main use is one powerful agent.' },
        { id: 'lg', label: 'LangGraph', sub: 'graph + checkpoints', x: 120, y: 360, w: 160, kind: 'server', info: 'What it is: an explicit graph (state, nodes, edges) + a checkpointer + interrupt. Your code (the graph) sets the path, so it sits on the control side; the top choice for multi-agent graphs and durable flows.' },
        { id: 'adk', label: 'Google ADK', sub: 'workflow + LLM agents', x: 360, y: 400, w: 160, kind: 'server', info: 'What it is: Google\'s framework. Workflow agents (Sequential/Parallel/Loop) give control, while LLM agents and sub_agents give autonomy; so it sits in the middle. It talks to agents of other systems through A2A.' },
        { id: 'oai', label: 'OpenAI Agents SDK', sub: 'handoffs, guardrails', x: 540, y: 360, w: 160, kind: 'server', info: 'What it is: an SDK with few primitives: Agent, Runner, handoffs, guardrails, sessions, tracing. Agents give control to each other through handoffs, so it sits toward autonomy + multi-agent.' },
        { id: 'maf', label: 'MS Agent Framework', sub: 'agents + workflows', x: 200, y: 480, w: 170, kind: 'server', info: 'What it is: Microsoft\'s framework (the successor of AutoGen + Semantic Kernel). Graph workflows with checkpointing (control), agents and multi-agent orchestration; .NET and Python.' },
        { id: 'ag', label: 'AutoGen', sub: 'maintenance mode', x: 450, y: 480, w: 140, kind: 'queue', info: 'What it is: Microsoft Research\'s older multi-agent "conversation" framework (2023). Agents chatted with each other to get work done: more autonomy. Now in maintenance mode; for new work use the MS Agent Framework.' },
        { id: 'crew', label: 'CrewAI', sub: 'roles, crews, flows', x: 630, y: 470, w: 150, kind: 'server', info: 'What it is: a role-based team framework. Crews (agents + tasks + process) lean toward autonomy, especially with a hierarchical manager; Flows add a predictable layer on top.' },
      ],
      edges: [
        { a: 'lc', b: 'lg', label: 'runs on', dashed: true },
        { a: 'ag', b: 'maf', label: 'successor', kind: 'evt' },
      ],
      paths: [
        { name: 'No framework', text: 'Far left: full control, zero magic. With one agent and a few tools, start here; take a framework only when you see the need.', go: ['none'] },
        { name: 'LangChain family', text: 'LangChain\'s create_agent runs on LangGraph inside. Want an agent quickly: LangChain. Need a custom graph, checkpoints, interrupts: LangGraph directly.', go: ['lc>lg'] },
        { name: 'Data / RAG', text: 'The main job is answering questions over documents: LlamaIndex (data-first), or LangChain\'s retrievers. Both can also be combined with an orchestration framework.', go: ['llama', 'lc'] },
        { name: 'Vendor SDKs', text: 'The model companies\' own SDKs: OpenAI Agents SDK (handoffs, guardrails), Claude Agent SDK (a harness for files/terminal), Google ADK (Gemini, workflow agents, A2A).', go: ['oai', 'claude', 'adk'] },
        { name: 'Teams / enterprise', text: 'Teams of agents: CrewAI (roles, crews, flows) and the Microsoft Agent Framework (enterprise workflows). AutoGen\'s work now continues in the MS Agent Framework.', go: ['crew', 'ag>maf'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A framework gives <strong>plumbing</strong> (loop, tool schema, state, checkpoints, HITL, multi-agent, tracing), <strong>not quality</strong>. Quality comes from prompts, tools, context and evals.</li>
      <li>Ask first: do you need a framework at all? One agent + a few tools = <strong>no framework</strong> or a light SDK.</li>
      <li><strong>LangChain</strong>: Runnables/LCEL chains + <code>create_agent</code> + middleware. <strong>LangGraph</strong>: state, nodes, edges, reducers, checkpointer + thread_id, <code>interrupt()</code> → durable and controllable.</li>
      <li><strong>CrewAI</strong>: Agent (role/goal/backstory), Task, Crew, Process (sequential/hierarchical), and Flows as a predictable outer layer.</li>
      <li><strong>OpenAI Agents SDK</strong>: Agent + Runner, handoffs vs agents-as-tools, guardrail tripwires, sessions. <strong>Claude Agent SDK</strong>: the Claude Code harness (files, bash, permissions, hooks).</li>
      <li><strong>Google ADK</strong>: workflow agents + A2A. <strong>MS Agent Framework</strong>: the successor of AutoGen. <strong>LlamaIndex</strong>: readers, nodes, index, query engine.</li>
      <li>Less lock-in: tools as MCP servers, business logic outside the framework. Always check a tutorial's date and the package version.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: [
        'Plumbing like the loop, tool schema, state and retries is ready: ship faster',
        'Hard features like checkpoints, HITL, multi-agent and streaming in a tested form',
        'Built-in tracing and integrations (vector DBs, models, MCP)',
        'A common vocabulary and structure for the team',
      ],
      costs: [
        'The real prompts/calls hide behind the abstraction: debugging is harder',
        'Fast-changing APIs (several 0.x versions): upgrade work, old tutorials become wrong',
        'Dependency weight and lock-in; the framework\'s opinions shape your design',
        'Overkill for simple jobs: more code, more concepts',
      ] },

    { type: 'think', questions: [
      { q: 'xyz.com\'s refund agent: a refund above ₹2,000 needs a manager\'s approval, which sometimes comes the next day. Servers also restart in between. Which framework/feature?', a: 'LangGraph (or Microsoft Agent Framework workflows): the graph stops with interrupt(), the state is saved in a durable checkpointer (Postgres), and the next day it continues from the same place with the same thread_id + Command(resume=...). The refund tool takes an idempotency key, so a resume does not cause a double refund. An in-memory checkpointer will not work here, because a restart wipes everything.' },
      { q: 'A teammate says "let us make 5 agents in CrewAI: researcher, analyst, writer, reviewer, manager". The task is telling the order status. What will you say?', a: 'Overkill. This is a one-tool-call job: one agent or one simple workflow is enough. 5 agents = many LLM calls, more latency/cost and a risk of delegation loops. Use multi-agent when the job can run in parallel or does not fit in one context. First the simplest version + an eval, then add agents if a need appears.' },
      { q: 'You found a 2025 LangChain tutorial that uses LLMChain and initialize_agent. What will you do today?', a: 'After LangChain 1.0 (Oct 2025), these legacy APIs live in langchain-classic. Today use create_agent (agents) or LCEL/Runnables (simple chains), and read the current version of the official docs. A general rule: check the date of framework tutorials, and check the PyPI version + changelog.' },
    ] },
    { type: 'quiz', questions: [
      { q: 'How do you stop a LangGraph graph for human approval?', options: ['time.sleep()', 'interrupt() inside a node, with a checkpointer; resume with Command(resume=...)', 'Throw an exception', 'max_iter = 0'], answer: 1, explain: 'interrupt() pauses, the state is saved in the checkpointer, and Command(resume=value) on the same thread_id continues it.' },
      { q: 'What is required for Process.hierarchical in CrewAI?', options: ['At least 5 agents', 'manager_llm or manager_agent', 'A LangGraph checkpointer', 'human_input=True on every task'], answer: 1, explain: 'In the hierarchical process a manager delegates and reviews tasks; for that you must give a manager_llm or manager_agent.' },
      { q: 'What does "prompt | model | parser" mean in LCEL?', options: ['Three parallel calls', 'The output of one is the input of the next: a Runnable sequence', 'A shell pipe', 'Three separate agents'], answer: 1, explain: 'The pipe operator joins Runnables in sequence; the whole chain is also a Runnable with invoke/stream/batch.' },
      { q: 'The difference between a handoff and agent.as_tool() in the OpenAI Agents SDK?', options: ['No difference', 'In a handoff, control goes to the other agent; with as_tool, the calling agent stays in control', 'as_tool works only with OpenAI models', 'A handoff works only with guardrails'], answer: 1, explain: 'Handoff = transferring the conversation. Agent-as-tool = calling a specialist like a tool and taking the result, keeping control.' },
      { q: 'A LangGraph state has messages = [m1, m2]. A node returns {"messages": [m3]}, and the key has the add_messages reducer. The new state?', options: ['[m3]', '[m1, m2, m3]', '[m1, m2]', 'Error'], answer: 1, explain: 'The add_messages reducer adds the update to the old list. Without a reducer (default replace) only [m3] would remain and the history would be wiped.' },
      { q: 'The current status of AutoGen (Oct 2026)?', options: ['The newest Microsoft framework', 'Maintenance mode; the successor is the Microsoft Agent Framework (1.0 GA in April 2026)', 'Merged into LangChain', 'Only for .NET'], answer: 1, explain: 'The AutoGen and Semantic Kernel teams built the Microsoft Agent Framework; both older projects are now in maintenance mode.' },
      { q: 'The most data-focused framework for a RAG agent over documents?', options: ['CrewAI', 'LlamaIndex', 'Claude Agent SDK', 'Google ADK'], answer: 1, explain: 'The core of LlamaIndex is readers, nodes, indexes and query engines, that is, making data ready for the LLM.' },
    ] },
    { type: 'sources', note: 'All official docs were read on 4 Oct 2026; versions from the PyPI JSON API on the same day. APIs change fast.', items: [
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
