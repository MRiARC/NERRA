<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2025-02-14T00:00:00.000Z" agent="Mozilla/5.0" version="24.7.17">
  <diagram id="story-continuity-engine" name="Story Continuity Engine">
    <mxGraphModel
      dx="1800"
      dy="1100"
      grid="1"
      gridSize="10"
      guides="1"
      tooltips="1"
      connect="1"
      arrows="1"
      fold="1"
      page="1"
      pageScale="1"
      pageWidth="1800"
      pageHeight="1200"
      math="0"
      shadow="0">

      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>

        <!-- ===================== -->
        <!-- STYLES                 -->
        <!-- ===================== -->

        <!-- ===================== -->
        <!-- TITLE                  -->
        <!-- ===================== -->

        <mxCell id="title"
          value="AI Story Continuity and Intelligence Engine"
          style="text;html=1;strokeColor=none;fillColor=none;fontSize=24;fontStyle=1;fontColor=#1f2937;align=left;verticalAlign=middle;"
          vertex="1" parent="1">
          <mxGeometry x="40" y="20" width="900" height="45" as="geometry"/>
        </mxCell>

        <mxCell id="subtitle"
          value="Incremental manuscript analysis, story-graph maintenance, contradiction detection, and writer feedback"
          style="text;html=1;strokeColor=none;fillColor=none;fontSize=13;fontColor=#6b7280;align=left;verticalAlign=middle;"
          vertex="1" parent="1">
          <mxGeometry x="42" y="62" width="1000" height="28" as="geometry"/>
        </mxCell>

        <!-- ===================== -->
        <!-- LAYER 1: EVENTS        -->
        <!-- ===================== -->

        <mxCell id="layer_events"
          value="1. EDITOR EVENTS AND TRIGGERS"
          style="swimlane;html=1;rounded=1;horizontal=0;startSize=32;collapsible=0;fillColor=#eff6ff;strokeColor=#60a5fa;strokeWidth=2;fontStyle=1;fontColor=#1e3a8a;"
          vertex="1" parent="1">
          <mxGeometry x="40" y="110" width="1720" height="150" as="geometry"/>
        </mxCell>

        <mxCell id="event_import"
          value="Import Manuscript"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#60a5fa;strokeWidth=1.5;fontColor=#1f2937;"
          vertex="1" parent="layer_events">
          <mxGeometry x="30" y="58" width="170" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="event_chapter"
          value="New Chapter Added"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#60a5fa;strokeWidth=1.5;fontColor=#1f2937;"
          vertex="1" parent="layer_events">
          <mxGeometry x="230" y="58" width="170" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="event_edit"
          value="Paragraph Edited"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#60a5fa;strokeWidth=1.5;fontColor=#1f2937;"
          vertex="1" parent="layer_events">
          <mxGeometry x="430" y="58" width="170" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="event_pause"
          value="Live Writing Pause"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#60a5fa;strokeWidth=1.5;fontColor=#1f2937;"
          vertex="1" parent="layer_events">
          <mxGeometry x="630" y="58" width="170" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="event_question"
          value="User Asks Story Question"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#60a5fa;strokeWidth=1.5;fontColor=#1f2937;"
          vertex="1" parent="layer_events">
          <mxGeometry x="830" y="58" width="190" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="event_correction"
          value="User Corrects AI"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#60a5fa;strokeWidth=1.5;fontColor=#1f2937;"
          vertex="1" parent="layer_events">
          <mxGeometry x="1050" y="58" width="170" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="event_rewrite"
          value="Large Rewrite"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#60a5fa;strokeWidth=1.5;fontColor=#1f2937;"
          vertex="1" parent="layer_events">
          <mxGeometry x="1250" y="58" width="170" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="trigger"
          value="Event Router&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;debounce • diff • prioritize&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#2563eb;strokeWidth=2;fontStyle=1;fontColor=#1e3a8a;"
          vertex="1" parent="layer_events">
          <mxGeometry x="1480" y="48" width="200" height="68" as="geometry"/>
        </mxCell>

        <!-- ===================== -->
        <!-- LAYER 2: INGESTION     -->
        <!-- ===================== -->

        <mxCell id="layer_ingestion"
          value="2. INGESTION, VERSIONING, AND RETRIEVAL"
          style="swimlane;html=1;rounded=1;horizontal=0;startSize=32;collapsible=0;fillColor=#f0fdf4;strokeColor=#4ade80;strokeWidth=2;fontStyle=1;fontColor=#166534;"
          vertex="1" parent="1">
          <mxGeometry x="40" y="290" width="1720" height="190" as="geometry"/>
        </mxCell>

        <mxCell id="change_manager"
          value="Change Manager&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;event ID • document version • changed spans&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#4ade80;strokeWidth=1.5;"
          vertex="1" parent="layer_ingestion">
          <mxGeometry x="40" y="58" width="235" height="70" as="geometry"/>
        </mxCell>

        <mxCell id="parser"
          value="Manuscript Parser&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;chapters • scenes • paragraphs • dialogue&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#4ade80;strokeWidth=1.5;"
          vertex="1" parent="layer_ingestion">
          <mxGeometry x="320" y="58" width="210" height="70" as="geometry"/>
        </mxCell>

        <mxCell id="chunker"
          value="Chunking and Entity Extraction&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;characters • objects • locations • events&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#4ade80;strokeWidth=1.5;"
          vertex="1" parent="layer_ingestion">
          <mxGeometry x="575" y="58" width="245" height="70" as="geometry"/>
        </mxCell>

        <mxCell id="graph_db"
          value="Story Graph DB&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;entities • relations • events • claims • versions&lt;/font&gt;"
          style="shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=10;whiteSpace=wrap;html=1;fillColor=#dcfce7;strokeColor=#16a34a;strokeWidth=2;"
          vertex="1" parent="layer_ingestion">
          <mxGeometry x="880" y="48" width="220" height="88" as="geometry"/>
        </mxCell>

        <mxCell id="vector_store"
          value="Vector Store&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;semantic manuscript passages&lt;/font&gt;"
          style="shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=10;whiteSpace=wrap;html=1;fillColor=#dcfce7;strokeColor=#16a34a;strokeWidth=2;"
          vertex="1" parent="layer_ingestion">
          <mxGeometry x="1160" y="48" width="210" height="88" as="geometry"/>
        </mxCell>

        <mxCell id="snapshot_store"
          value="Version / Snapshot Store&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;undo • audit • rewrite comparison&lt;/font&gt;"
          style="shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=10;whiteSpace=wrap;html=1;fillColor=#dcfce7;strokeColor=#16a34a;strokeWidth=2;"
          vertex="1" parent="layer_ingestion">
          <mxGeometry x="1430" y="48" width="240" height="88" as="geometry"/>
        </mxCell>

        <!-- ===================== -->
        <!-- LAYER 3: CONTEXT       -->
        <!-- ===================== -->

        <mxCell id="layer_context"
          value="3. CONTEXT CONSTRUCTION"
          style="swimlane;html=1;rounded=1;horizontal=0;startSize=32;collapsible=0;fillColor=#fefce8;strokeColor=#facc15;strokeWidth=2;fontStyle=1;fontColor=#854d0e;"
          vertex="1" parent="1">
          <mxGeometry x="40" y="510" width="1720" height="165" as="geometry"/>
        </mxCell>

        <mxCell id="retrieval"
          value="Targeted Retrieval&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;changed scene + dependent entities&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#eab308;strokeWidth=1.5;"
          vertex="1" parent="layer_context">
          <mxGeometry x="50" y="58" width="230" height="65" as="geometry"/>
        </mxCell>

        <mxCell id="context_builder"
          value="Context Builder&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;assemble relevant evidence and state&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef3c7;strokeColor=#ca8a04;strokeWidth=2;fontStyle=1;"
          vertex="1" parent="layer_context">
          <mxGeometry x="350" y="50" width="245" height="80" as="geometry"/>
        </mxCell>

        <mxCell id="context_packet"
          value="Context Packet&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;passages • graph facts • timeline • instructions&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#eab308;strokeWidth=1.5;"
          vertex="1" parent="layer_context">
          <mxGeometry x="665" y="58" width="245" height="65" as="geometry"/>
        </mxCell>

        <mxCell id="custom_context"
          value="Custom Context Rules&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;author-defined canon and exclusions&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#eab308;strokeWidth=1.5;dashed=1;"
          vertex="1" parent="layer_context">
          <mxGeometry x="980" y="58" width="245" height="65" as="geometry"/>
        </mxCell>

        <mxCell id="analysis_plan"
          value="Analysis Planner&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;select modules and processing depth&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#eab308;strokeWidth=1.5;"
          vertex="1" parent="layer_context">
          <mxGeometry x="1295" y="58" width="245" height="65" as="geometry"/>
        </mxCell>

        <!-- ===================== -->
        <!-- LAYER 4: AI ANALYSIS   -->
        <!-- ===================== -->

        <mxCell id="layer_analysis"
          value="4. AI ANALYSIS"
          style="swimlane;html=1;rounded=1;horizontal=0;startSize=32;collapsible=0;fillColor=#f5f3ff;strokeColor=#a78bfa;strokeWidth=2;fontStyle=1;fontColor=#5b21b6;"
          vertex="1" parent="1">
          <mxGeometry x="40" y="705" width="1720" height="170" as="geometry"/>
        </mxCell>

        <mxCell id="ai_processing"
          value="AI Processing Orchestrator&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;structured extraction • inference • explanation&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ede9fe;strokeColor=#7c3aed;strokeWidth=2;fontStyle=1;"
          vertex="1" parent="layer_analysis">
          <mxGeometry x="50" y="52" width="280" height="75" as="geometry"/>
        </mxCell>

        <mxCell id="character_analysis"
          value="Character and Relationship Analysis"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#a78bfa;strokeWidth=1.5;"
          vertex="1" parent="layer_analysis">
          <mxGeometry x="390" y="52" width="240" height="75" as="geometry"/>
        </mxCell>

        <mxCell id="world_analysis"
          value="World, Object, and Location Analysis"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#a78bfa;strokeWidth=1.5;"
          vertex="1" parent="layer_analysis">
          <mxGeometry x="680" y="52" width="240" height="75" as="geometry"/>
        </mxCell>

        <mxCell id="timeline_analysis"
          value="Timeline and Knowledge-State Analysis"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#a78bfa;strokeWidth=1.5;"
          vertex="1" parent="layer_analysis">
          <mxGeometry x="970" y="52" width="240" height="75" as="geometry"/>
        </mxCell>

        <mxCell id="plot_analysis"
          value="Plot Thread and Continuity Analysis"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#a78bfa;strokeWidth=1.5;"
          vertex="1" parent="layer_analysis">
          <mxGeometry x="1260" y="52" width="240" height="75" as="geometry"/>
        </mxCell>

        <!-- ===================== -->
        <!-- LAYER 5: VALIDATION    -->
        <!-- ===================== -->

        <mxCell id="layer_validation"
          value="5. VALIDATION AND CONFIDENCE ROUTING"
          style="swimlane;html=1;rounded=1;horizontal=0;startSize=32;collapsible=0;fillColor=#fff7ed;strokeColor=#fb923c;strokeWidth=2;fontStyle=1;fontColor=#9a3412;"
          vertex="1" parent="1">
          <mxGeometry x="40" y="905" width="1720" height="175" as="geometry"/>
        </mxCell>

        <mxCell id="validation"
          value="Validation Layer&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;schema • evidence • consistency • policy checks&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffedd5;strokeColor=#ea580c;strokeWidth=2;fontStyle=1;"
          vertex="1" parent="layer_validation">
          <mxGeometry x="50" y="52" width="285" height="75" as="geometry"/>
        </mxCell>

        <mxCell id="confidence"
          value="Confidence and Risk Score&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;confidence × impact × reversibility&lt;/font&gt;"
          style="rhombus;whiteSpace=wrap;html=1;fillColor=#ffedd5;strokeColor=#ea580c;strokeWidth=2;fontStyle=1;"
          vertex="1" parent="layer_validation">
          <mxGeometry x="405" y="42" width="205" height="95" as="geometry"/>
        </mxCell>

        <mxCell id="low_route"
          value="Low Confidence&lt;br&gt;Reject / Hold"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fee2e2;strokeColor=#dc2626;strokeWidth=1.5;"
          vertex="1" parent="layer_validation">
          <mxGeometry x="690" y="52" width="190" height="75" as="geometry"/>
        </mxCell>

        <mxCell id="medium_route"
          value="Medium Confidence&lt;br&gt;Human Review"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fef3c7;strokeColor=#d97706;strokeWidth=1.5;"
          vertex="1" parent="layer_validation">
          <mxGeometry x="940" y="52" width="210" height="75" as="geometry"/>
        </mxCell>

        <mxCell id="high_route"
          value="High Confidence&lt;br&gt;Automatic Proposal"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dcfce7;strokeColor=#16a34a;strokeWidth=1.5;"
          vertex="1" parent="layer_validation">
          <mxGeometry x="1210" y="52" width="220" height="75" as="geometry"/>
        </mxCell>

        <mxCell id="human_review"
          value="Human Review&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;accept • reject • edit • mark as intentional&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#d97706;strokeWidth=1.5;"
          vertex="1" parent="layer_validation">
          <mxGeometry x="1490" y="52" width="220" height="75" as="geometry"/>
        </mxCell>

        <!-- ===================== -->
        <!-- LAYER 6: GRAPH         -->
        <!-- ===================== -->

        <mxCell id="layer_graph"
          value="6. STORY GRAPH UPDATE AND REASONING"
          style="swimlane;html=1;rounded=1;horizontal=0;startSize=32;collapsible=0;fillColor=#f0fdfa;strokeColor=#2dd4bf;strokeWidth=2;fontStyle=1;fontColor=#115e59;"
          vertex="1" parent="1">
          <mxGeometry x="40" y="1110" width="1720" height="225" as="geometry"/>
        </mxCell>

        <mxCell id="graph_update"
          value="Graph Update Service&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;merge claims • preserve provenance • create version&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ccfbf1;strokeColor=#0f766e;strokeWidth=2;fontStyle=1;"
          vertex="1" parent="layer_graph">
          <mxGeometry x="50" y="58" width="285" height="80" as="geometry"/>
        </mxCell>

        <mxCell id="canon_graph"
          value="Canonical Story Graph&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;author-confirmed facts and relationships&lt;/font&gt;"
          style="shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=10;whiteSpace=wrap;html=1;fillColor=#ccfbf1;strokeColor=#0f766e;strokeWidth=2;"
          vertex="1" parent="layer_graph">
          <mxGeometry x="405" y="48" width="245" height="95" as="geometry"/>
        </mxCell>

        <mxCell id="belief_graph"
          value="Perspective / Belief Layer&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;what characters or narrators believe&lt;/font&gt;"
          style="shape=cylinder3;boundedLbl=1;backgroundOutline=1;size=10;whiteSpace=wrap;html=1;fillColor=#ccfbf1;strokeColor=#0f766e;strokeWidth=2;"
          vertex="1" parent="layer_graph">
          <mxGeometry x="705" y="48" width="245" height="95" as="geometry"/>
        </mxCell>

        <mxCell id="reasoning"
          value="Reasoning Layer&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;cross-module synthesis and explanation&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ccfbf1;strokeColor=#0f766e;strokeWidth=2;fontStyle=1;"
          vertex="1" parent="layer_graph">
          <mxGeometry x="1005" y="58" width="260" height="80" as="geometry"/>
        </mxCell>

        <mxCell id="contradiction"
          value="Contradiction Engine&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;fact conflict vs intentional narrative tension&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#14b8a6;strokeWidth=1.5;"
          vertex="1" parent="layer_graph">
          <mxGeometry x="1320" y="48" width="190" height="95" as="geometry"/>
        </mxCell>

        <mxCell id="module_summary"
          value="Intelligence Modules&lt;br&gt;Characters • Relationships • Timeline • Knowledge State&lt;br&gt;Plot Threads • Objects • Locations • World Rules"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#14b8a6;strokeWidth=1.5;"
          vertex="1" parent="layer_graph">
          <mxGeometry x="1560" y="42" width="180" height="110" as="geometry"/>
        </mxCell>

        <!-- ===================== -->
        <!-- LAYER 7: OUTPUT        -->
        <!-- ===================== -->

        <mxCell id="layer_output"
          value="7. USER OUTPUT AND FEEDBACK"
          style="swimlane;html=1;rounded=1;horizontal=0;startSize=32;collapsible=0;fillColor=#fdf2f8;strokeColor=#f472b6;strokeWidth=2;fontStyle=1;fontColor=#9d174d;"
          vertex="1" parent="1">
          <mxGeometry x="40" y="1365" width="1720" height="155" as="geometry"/>
        </mxCell>

        <mxCell id="user_output"
          value="User Output&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;warnings • explanations • story queries • suggestions&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fce7f3;strokeColor=#db2777;strokeWidth=2;fontStyle=1;"
          vertex="1" parent="layer_output">
          <mxGeometry x="60" y="52" width="290" height="70" as="geometry"/>
        </mxCell>

        <mxCell id="ui_modes"
          value="Interface Modes&lt;br&gt;inline warning • story bible • timeline • graph view • chat"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#f472b6;strokeWidth=1.5;"
          vertex="1" parent="layer_output">
          <mxGeometry x="430" y="52" width="280" height="70" as="geometry"/>
        </mxCell>

        <mxCell id="feedback"
          value="Feedback Loop&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;corrections • accepted proposals • dismissed warnings&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fce7f3;strokeColor=#db2777;strokeWidth=2;fontStyle=1;"
          vertex="1" parent="layer_output">
          <mxGeometry x="790" y="52" width="290" height="70" as="geometry"/>
        </mxCell>

        <mxCell id="audit"
          value="Audit and Learning Signals&lt;br&gt;&lt;font style=&quot;font-size:11px&quot;&gt;provenance • evaluation data • user preferences&lt;/font&gt;"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#f472b6;strokeWidth=1.5;"
          vertex="1" parent="layer_output">
          <mxGeometry x="1160" y="52" width="290" height="70" as="geometry"/>
        </mxCell>

        <!-- ===================== -->
        <!-- EXTENSIONS             -->
        <!-- ===================== -->

        <mxCell id="extensions"
          value="Optional / Future Extensions"
          style="swimlane;html=1;rounded=1;horizontal=0;startSize=30;collapsible=0;fillColor=#fafafa;strokeColor=#9ca3af;strokeWidth=1.5;fontStyle=1;fontColor=#4b5563;"
          vertex="1" parent="1">
          <mxGeometry x="40" y="1555" width="1720" height="130" as="geometry"/>
        </mxCell>

        <mxCell id="ext_pronoun"
          value="Pronoun Resolution"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#9ca3af;dashed=1;"
          vertex="1" parent="extensions">
          <mxGeometry x="35" y="48" width="170" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="ext_narrator"
          value="Unreliable Narrator Model"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#9ca3af;dashed=1;"
          vertex="1" parent="extensions">
          <mxGeometry x="235" y="48" width="200" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="ext_flashback"
          value="Flashback Detection"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#9ca3af;dashed=1;"
          vertex="1" parent="extensions">
          <mxGeometry x="465" y="48" width="180" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="ext_world"
          value="World Rule Extraction"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#9ca3af;dashed=1;"
          vertex="1" parent="extensions">
          <mxGeometry x="675" y="48" width="190" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="ext_plot"
          value="Plot Thread Resolution"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#9ca3af;dashed=1;"
          vertex="1" parent="extensions">
          <mxGeometry x="895" y="48" width="200" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="ext_custom"
          value="Custom Prompts • Validation • Graph Writes • UI Output"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#9ca3af;dashed=1;"
          vertex="1" parent="extensions">
          <mxGeometry x="1125" y="48" width="330" height="48" as="geometry"/>
        </mxCell>

        <mxCell id="ext_batch"
          value="Large Rewrite Batch Processor"
          style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#9ca3af;dashed=1;"
          vertex="1" parent="extensions">
          <mxGeometry x="1485" y="48" width="205" height="48" as="geometry"/>
        </mxCell>

        <!-- ===================== -->
        <!-- MAIN FLOW EDGES        -->
        <!-- ===================== -->

        <mxCell id="e1" edge="1" parent="1" source="event_import" target="trigger"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e2" edge="1" parent="1" source="event_chapter" target="trigger"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e3" edge="1" parent="1" source="event_edit" target="trigger"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e4" edge="1" parent="1" source="event_pause" target="trigger"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e5" edge="1" parent="1" source="event_question" target="trigger"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e6" edge="1" parent="1" source="event_correction" target="trigger"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e7" edge="1" parent="1" source="event_rewrite" target="trigger"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>

        <mxCell id="e8" edge="1" parent="1" source="trigger" target="change_manager"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>

        <mxCell id="e9" edge="1" parent="1" source="change_manager" target="parser"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e10" edge="1" parent="1" source="parser" target="chunker"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e11" edge="1" parent="1" source="chunker" target="graph_db"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e12" edge="1" parent="1" source="chunker" target="vector_store"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e13" edge="1" parent="1" source="change_manager" target="snapshot_store"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>

        <mxCell id="e14" edge="1" parent="1" source="graph_db" target="retrieval"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e15" edge="1" parent="1" source="vector_store" target="retrieval"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e16" edge="1" parent="1" source="retrieval" target="context_builder"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e17" edge="1" parent="1" source="context_builder" target="context_packet"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e18" edge="1" parent="1" source="custom_context" target="context_builder"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;dashed=1;"/>
        <mxCell id="e19" edge="1" parent="1" source="context_packet" target="analysis_plan"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e20" edge="1" parent="1" source="analysis_plan" target="ai_processing"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>

        <mxCell id="e21" edge="1" parent="1" source="ai_processing" target="character_analysis"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e22" edge="1" parent="1" source="ai_processing" target="world_analysis"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e23" edge="1" parent="1" source="ai_processing" target="timeline_analysis"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e24" edge="1" parent="1" source="ai_processing" target="plot_analysis"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>

        <mxCell id="e25" edge="1" parent="1" source="character_analysis" target="validation"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e26" edge="1" parent="1" source="world_analysis" target="validation"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e27" edge="1" parent="1" source="timeline_analysis" target="validation"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e28" edge="1" parent="1" source="plot_analysis" target="validation"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>

        <mxCell id="e29" edge="1" parent="1" source="validation" target="confidence"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e30" edge="1" parent="1" source="confidence" target="low_route"
          value="Low"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e31" edge="1" parent="1" source="confidence" target="medium_route"
          value="Medium"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e32" edge="1" parent="1" source="confidence" target="high_route"
          value="High"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e33" edge="1" parent="1" source="medium_route" target="human_review"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>

        <mxCell id="e34" edge="1" parent="1" source="high_route" target="graph_update"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e35" edge="1" parent="1" source="human_review" target="graph_update"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e36" edge="1" parent="1" source="low_route" target="feedback"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;dashed=1;"/>

        <mxCell id="e37" edge="1" parent="1" source="graph_update" target="canon_graph"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e38" edge="1" parent="1" source="graph_update" target="belief_graph"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;"/>
        <mxCell id="e39" edge="1" parent="1" source="canon_graph" target="reasoning"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e40" edge="1" parent="1" source="belief_graph" target="reasoning"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e41" edge="1" parent="1" source="reasoning" target="contradiction"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e42" edge="1" parent="1" source="reasoning" target="module_summary"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>

        <mxCell id="e43" edge="1" parent="1" source="contradiction" target="user_output"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e44" edge="1" parent="1" source="module_summary" target="user_output"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e45" edge="1" parent="1" source="user_output" target="ui_modes"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e46" edge="1" parent="1" source="ui_modes" target="feedback"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;"/>
        <mxCell id="e47" edge="1" parent="1" source="feedback" target="audit"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;"/>
        <mxCell id="e48" edge="1" parent="1" source="feedback" target="context_builder"
          value="New correction / preference"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;dashed=1;"/>

        <!-- ===================== -->
        <!-- EXTENSION EDGES        -->
        <!-- ===================== -->

        <mxCell id="x1" edge="1" parent="1" source="ext_pronoun" target="validation"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;dashed=1;"/>
        <mxCell id="x2" edge="1" parent="1" source="ext_narrator" target="belief_graph"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;dashed=1;"/>
        <mxCell id="x3" edge="1" parent="1" source="ext_flashback" target="timeline_analysis"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;dashed=1;"/>
        <mxCell id="x4" edge="1" parent="1" source="ext_world" target="world_analysis"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;dashed=1;"/>
        <mxCell id="x5" edge="1" parent="1" source="ext_plot" target="plot_analysis"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;dashed=1;"/>
        <mxCell id="x6" edge="1" parent="1" source="ext_custom" target="context_builder"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;dashed=1;"/>
        <mxCell id="x7" edge="1" parent="1" source="ext_batch" target="change_manager"
          style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;endArrow=block;html=1;dashed=1;"/>

      </root>
    </mxGraphModel>
  </diagram>
</mxfile>

what do you think of the product, thinking