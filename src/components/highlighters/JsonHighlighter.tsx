import { memo, useMemo } from 'react';
import VariableHighlighter from './VariableHighlighter';
import { tokenizeJson } from './jsonSyntax';

interface Props {
  text: string;
  highlightColor: string;
  variables?: string[];
}

export default memo(function JsonHighlighter({ text, highlightColor, variables }: Props) {
  const tokens = useMemo(() => tokenizeJson(text), [text]);
  if (!tokens) return <VariableHighlighter text={text} highlightColor={highlightColor} variables={variables} />;

  return <>{tokens.map(({ text: value, kind }, index) => (
    <span key={index} className={kind ? `json-token-${kind}` : undefined}>
      {value.includes('{{')
        ? <VariableHighlighter text={value} highlightColor={highlightColor} variables={variables} />
        : value}
    </span>
  ))}</>;
});
