import { useState, useEffect, useRef, useCallback } from 'react';

export function useMonitorData() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [connected, setConnected] = useState(false);
  const [autoscalerState, setAutoscalerState] = useState(null);
  const [taskLogs, setTaskLogs] = useState({});
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'init') {
        setHistory(msg.history || []);
        setData(msg.current);
        if (msg.current?.autoscaler) setAutoscalerState(msg.current.autoscaler);
      } else if (msg.type === 'update') {
        setData(msg);
        if (msg.autoscaler) setAutoscalerState(msg.autoscaler);
        setHistory(prev => {
          const next = [...prev, {
            timestamp: msg.timestamp,
            cpu: msg.cpu.overall,
            memory: msg.memory.total > 0
              ? Math.round((msg.memory.used / msg.memory.total) * 1000) / 10
              : 0,
          }];
          if (next.length > 600) next.shift();
          return next;
        });
      } else if (msg.type === 'task-log') {
        setTaskLogs(prev => ({ ...prev, [msg.taskId]: msg.log }));
      } else if (msg.type === 'autoscaler') {
        setAutoscalerState(msg);
        // +/-ボタン操作後の即時反映: pueueGroupsがあればdata.pueue.groupsを更新
        if (msg.pueueGroups) {
          setData(prev => prev ? { ...prev, pueue: { ...prev.pueue, groups: msg.pueueGroups } } : prev);
        }
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const sendMessage = useCallback((obj) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(obj));
    }
  }, []);

  return { data, history, connected, autoscalerState, sendMessage, taskLogs };
}
