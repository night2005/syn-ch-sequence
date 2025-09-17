import { useState, useRef, useEffect } from "react";
import { animate } from "animejs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  Download,
  Camera,
  Wifi,
  WifiOff
} from "lucide-react";

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface PacketAnimation {
  type: 'SYN' | 'SYN-ACK' | 'ACK';
  seq?: number;
  ack?: number;
  direction: 'client-to-server' | 'server-to-client';
}

type TCPState = 'CLOSED' | 'SYN-SENT' | 'SYN-RECEIVED' | 'ESTABLISHED' | 'FAILED';
type ConnectionStatus = 'idle' | 'connecting' | 'established' | 'failed';
type SimulationMode = 'auto' | 'step';
type PacketLoss = 'none' | 'syn' | 'syn-ack' | 'ack' | 'random';

export default function TCPHandshakeSimulator() {
  // State management
  const [clientState, setClientState] = useState<TCPState>('CLOSED');
  const [serverState, setServerState] = useState<TCPState>('CLOSED');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('auto');
  const [packetLoss, setPacketLoss] = useState<PacketLoss>('none');
  const [animationSpeed, setAnimationSpeed] = useState([2000]);
  const [randomizeISN, setRandomizeISN] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Animation refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const packetRef = useRef<HTMLDivElement>(null);
  const connectionLineRef = useRef<HTMLDivElement>(null);
  
  // Sequence numbers
  const [clientISN, setClientISN] = useState(1000);
  const [serverISN, setServerISN] = useState(2000);
  const [clientSeq, setClientSeq] = useState(1000);
  const [serverSeq, setServerSeq] = useState(2000);

  // Generate random ISN if enabled
  const generateISN = () => {
    return randomizeISN ? Math.floor(Math.random() * 10000) + 1000 : 1000;
  };

  // Add log entry
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const timestamp = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    setLogs(prev => [...prev, {
      id: Date.now(),
      timestamp,
      message,
      type
    }]);
  };

  // Reset simulation
  const resetSimulation = () => {
    setClientState('CLOSED');
    setServerState('CLOSED');
    setConnectionStatus('idle');
    setCurrentStep(0);
    setIsSimulating(false);
    setRetryCount(0);
    
    const newClientISN = generateISN();
    const newServerISN = generateISN();
    setClientISN(newClientISN);
    setServerISN(newServerISN);
    setClientSeq(newClientISN);
    setServerSeq(newServerISN);
    
    setLogs([]);
    addLog("Simulation reset. Ready to start TCP 3-Way Handshake.", 'info');
    
    // Reset animations
    if (packetRef.current) {
      animate(packetRef.current, { opacity: 0, translateX: 0, duration: 0 });
    }
    if (connectionLineRef.current) {
      animate(connectionLineRef.current, { opacity: 0, duration: 0 });
    }
  };

  // Simulate packet loss
  const shouldDropPacket = (packetType: string): boolean => {
    if (packetLoss === 'none') return false;
    if (packetLoss === packetType.toLowerCase()) return true;
    if (packetLoss === 'random') return Math.random() < 0.3;
    return false;
  };

  // Animate packet
  const animatePacket = async (animation: PacketAnimation): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!packetRef.current || !canvasRef.current) {
        resolve(false);
        return;
      }

      const packet = packetRef.current;
      const canvas = canvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      
      // Check for packet loss
      if (shouldDropPacket(animation.type)) {
        addLog(`❌ ${animation.type} packet lost!`, 'error');
        setTimeout(() => resolve(false), 500);
        return;
      }

      // Set packet content and style
      packet.textContent = `${animation.type}${animation.seq ? ` (seq=${animation.seq}${animation.ack ? `, ack=${animation.ack}` : ''})` : ''}`;
      
      // Set packet color based on type
      const packetClass = {
        'SYN': 'bg-packet-syn',
        'SYN-ACK': 'bg-gradient-primary',
        'ACK': 'bg-packet-ack'
      }[animation.type];
      
      packet.className = `absolute z-10 px-4 py-2 rounded-lg text-sm font-mono text-white shadow-lg ${packetClass}`;

      // Set initial position and make visible
      const startX = animation.direction === 'client-to-server' ? 0 : canvasRect.width - 200;
      const endX = animation.direction === 'client-to-server' ? canvasRect.width - 200 : 0;
      
      animate(packet, {
        opacity: 1,
        translateX: startX,
        translateY: canvasRect.height / 2 - 20,
        duration: 0
      });

      // Animate packet movement
      animate(packet, {
        translateX: endX,
        duration: animationSpeed[0],
        easing: 'easeInOutQuad',
        complete: () => {
          // Fade out packet
          animate(packet, {
            opacity: 0,
            duration: 300,
            complete: () => resolve(true)
          });
        }
      });

      // Log the packet
      const direction = animation.direction === 'client-to-server' ? 'Client → Server' : 'Server → Client';
      addLog(`📤 ${direction}: ${animation.type}${animation.seq ? ` (seq=${animation.seq}${animation.ack ? `, ack=${animation.ack}` : ''})` : ''}`, 'info');
    });
  };

  // Execute handshake step
  const executeStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 1: // SYN
        setClientState('SYN-SENT');
        setConnectionStatus('connecting');
        return await animatePacket({
          type: 'SYN',
          seq: clientSeq,
          direction: 'client-to-server'
        });

      case 2: // SYN-ACK
        setServerState('SYN-RECEIVED');
        return await animatePacket({
          type: 'SYN-ACK',
          seq: serverSeq,
          ack: clientSeq + 1,
          direction: 'server-to-client'
        });

      case 3: // ACK
        const success = await animatePacket({
          type: 'ACK',
          seq: clientSeq + 1,
          ack: serverSeq + 1,
          direction: 'client-to-server'
        });
        
        if (success) {
          setClientState('ESTABLISHED');
          setServerState('ESTABLISHED');
          setConnectionStatus('established');
          
          // Show connection established animation
          if (connectionLineRef.current) {
            animate(connectionLineRef.current, {
              opacity: 1,
              duration: 500,
              easing: 'easeInOutQuad'
            });
          }
          
          addLog("✅ CONNECTION ESTABLISHED", 'success');
        }
        
        return success;

      default:
        return false;
    }
  };

  // Handle step execution with retries
  const handleStepExecution = async (step: number) => {
    const maxRetries = 3;
    let attempts = 0;
    
    while (attempts < maxRetries) {
      const success = await executeStep(step);
      
      if (success) {
        setRetryCount(0);
        return true;
      } else {
        attempts++;
        setRetryCount(attempts);
        
        if (attempts < maxRetries) {
          addLog(`🔄 Retransmitting... (Attempt ${attempts + 1}/${maxRetries})`, 'warning');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // Failed after max retries
    setConnectionStatus('failed');
    setClientState('FAILED');
    setServerState('FAILED');
    addLog("❌ CONNECTION FAILED - Max retries exceeded", 'error');
    setIsSimulating(false);
    return false;
  };

  // Start auto simulation
  const startAutoSimulation = async () => {
    setIsSimulating(true);
    
    for (let step = 1; step <= 3; step++) {
      if (!isSimulating) break;
      
      const success = await handleStepExecution(step);
      if (!success) break;
      
      setCurrentStep(step);
      
      if (step < 3) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setIsSimulating(false);
  };

  // Step mode execution
  const executeNextStep = async () => {
    if (currentStep >= 3) return;
    
    setIsSimulating(true);
    const nextStep = currentStep + 1;
    const success = await handleStepExecution(nextStep);
    
    if (success) {
      setCurrentStep(nextStep);
    }
    
    setIsSimulating(false);
  };

  // Export logs
  const exportLogs = () => {
    const logText = logs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tcp-handshake-logs.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Initialize simulation on mount
  useEffect(() => {
    resetSimulation();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          TCP 3-Way Handshake Simulator
        </h1>
        <p className="text-muted-foreground text-lg">
          Interactive visualization of TCP connection establishment with packet loss simulation
        </p>
      </div>

      {/* Connection Status Banner */}
      {connectionStatus === 'established' && (
        <div className="mx-auto max-w-md">
          <Card className="bg-gradient-success border-success animate-connection-established shadow-glow-success">
            <CardContent className="p-6 text-center">
              <Wifi className="w-8 h-8 mx-auto mb-2 text-success-foreground" />
              <h3 className="text-xl font-bold text-success-foreground">CONNECTION ESTABLISHED</h3>
            </CardContent>
          </Card>
        </div>
      )}

      {connectionStatus === 'failed' && (
        <div className="mx-auto max-w-md">
          <Card className="bg-gradient-danger border-destructive animate-shake shadow-glow-danger">
            <CardContent className="p-6 text-center">
              <WifiOff className="w-8 h-8 mx-auto mb-2 text-destructive-foreground" />
              <h3 className="text-xl font-bold text-destructive-foreground">CONNECTION FAILED</h3>
              <p className="text-sm text-destructive-foreground/80">Max retries exceeded</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Simulation Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Client Node */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse-glow"></div>
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">State</div>
              <Badge variant={clientState === 'ESTABLISHED' ? 'default' : 'secondary'}>
                {clientState}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">ISN</div>
              <div className="font-mono text-sm">{clientISN}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Current Seq</div>
              <div className="font-mono text-sm">{clientSeq}</div>
            </div>
          </CardContent>
        </Card>

        {/* Animation Canvas */}
        <div className="lg:col-span-2 relative">
          <Card className="h-full min-h-[300px]">
            <CardContent className="p-0 relative h-full">
              <div 
                ref={canvasRef}
                className="relative w-full h-full min-h-[300px] bg-gradient-secondary rounded-lg overflow-hidden"
              >
                {/* Connection Line */}
                <div 
                  ref={connectionLineRef}
                  className="absolute top-1/2 left-4 right-4 h-1 bg-gradient-primary opacity-0 rounded-full shadow-glow-primary"
                  style={{ transform: 'translateY(-50%)' }}
                />
                
                {/* Animated Packet */}
                <div 
                  ref={packetRef}
                  className="absolute opacity-0 px-4 py-2 rounded-lg text-sm font-mono text-white shadow-lg"
                />
                
                {/* Step Indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {[1, 2, 3].map((step) => (
                    <div 
                      key={step}
                      className={`w-3 h-3 rounded-full ${
                        currentStep >= step ? 'bg-primary' : 'bg-muted'
                      } transition-colors duration-300`}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Server Node */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent animate-pulse-glow"></div>
              Server
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">State</div>
              <Badge variant={serverState === 'ESTABLISHED' ? 'default' : 'secondary'}>
                {serverState}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">ISN</div>
              <div className="font-mono text-sm">{serverISN}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Current Seq</div>
              <div className="font-mono text-sm">{serverSeq}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Control Panel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Controls */}
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={simulationMode === 'auto' ? startAutoSimulation : executeNextStep}
              disabled={isSimulating || (simulationMode === 'step' && currentStep >= 3)}
              className="flex items-center gap-2"
            >
              {simulationMode === 'auto' ? (
                <>
                  <Play className="w-4 h-4" />
                  Start Simulation
                </>
              ) : (
                <>
                  <StepForward className="w-4 h-4" />
                  Next Step {currentStep < 3 ? `(${currentStep + 1}/3)` : ''}
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={resetSimulation}
              disabled={isSimulating}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>

          <Separator />

          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Simulation Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Simulation Mode</label>
              <Select value={simulationMode} onValueChange={(value: SimulationMode) => setSimulationMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="step">Step-by-Step</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Packet Loss */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Packet Loss</label>
              <Select value={packetLoss} onValueChange={(value: PacketLoss) => setPacketLoss(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="syn">SYN</SelectItem>
                  <SelectItem value="syn-ack">SYN-ACK</SelectItem>
                  <SelectItem value="ack">ACK</SelectItem>
                  <SelectItem value="random">Random (30%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Animation Speed */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Animation Speed</label>
              <div className="px-3">
                <Slider
                  value={animationSpeed}
                  onValueChange={setAnimationSpeed}
                  max={5000}
                  min={800}
                  step={200}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Fast</span>
                  <span>Slow</span>
                </div>
              </div>
            </div>

            {/* Random ISN */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="randomize-isn"
                  checked={randomizeISN}
                  onCheckedChange={(checked) => setRandomizeISN(checked === true)}
                />
                <label htmlFor="randomize-isn" className="text-sm">
                  Randomize ISNs
                </label>
              </div>
              {retryCount > 0 && (
                <div className="text-xs text-yellow-500">
                  Retry {retryCount}/3
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Event Log</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportLogs}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-40 w-full">
            <div className="space-y-1">
              {logs.map((log) => (
                <div 
                  key={log.id}
                  className={`text-sm font-mono p-2 rounded ${
                    log.type === 'success' ? 'bg-success/10 text-success' :
                    log.type === 'error' ? 'bg-destructive/10 text-destructive' :
                    log.type === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                    'bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span className="text-xs opacity-60">[{log.timestamp}]</span> {log.message}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}