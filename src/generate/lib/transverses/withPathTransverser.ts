import { TransformTraversalControl, ts } from 'ts-morph';
import { CodeTraversal } from '../codeWriter';

export function withPathTransverser(identifier: string, getter: string, setter?: string) {
  const visitThis: CodeTraversal = (info) => (traversal) => {
    // console.log(gen, traversal.currentNode.getText(), traversal.currentNode.kind)
    if (setter && ts.isBinaryExpression(traversal.currentNode)
      && traversal.currentNode.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(traversal.currentNode.left)
    ) {
      const props = propsFlat(traversal.currentNode.left)
      if (props && props.obj) {
        if (props.obj.getText() === identifier) {
          const r = ts.createCall(
            ts.createPropertyAccess(
              props.obj,
              ts.createIdentifier(setter)
            ),
            undefined,
            makepathexpr(props).concat([traversal.currentNode.right]),
          )
          return r
        }
      }
    } else if (ts.isPropertyAccessExpression(traversal.currentNode)) {
      const props = propsFlat(traversal.currentNode)
      if (props && props.obj) {
        if (props.obj.getText() === identifier) {
          const r = ts.createCall(
            ts.createPropertyAccess(
              props.obj,
              ts.createIdentifier(getter)
            ),
            undefined,
            makepathexpr(props)
          )
          return r
        }
      }
    }
    return traversal.visitChildren();
  }
  return visitThis
}

interface Props {
  obj: ts.Identifier
  path: Array<ts.Identifier | ts.PrivateIdentifier | ts.LeftHandSideExpression>
  str: boolean
}

function propsFlat(p: ts.PropertyAccessExpression): Props {
  const props: Props = { path: [], str: true } as any
  props.obj = append(p)
  return props
  function append(p: ts.PropertyAccessExpression): ts.Identifier {
    props.path.unshift(p.name)
    // console.log('append', p.expression.getText(), '.', p.name.getText(), ' path: ', props.path.map(p => p.getText()).join('-'))
    if (ts.isPropertyAccessExpression(p.expression)) {
      // console.log('append2')
      return append(p.expression)
    }
    else if (ts.isIdentifier(p.expression)) return p.expression
    props.str = false
    return null as any
  }
}

function makepathexpr(p: Props): ts.Expression[] {
  // console.log('makepathexpr', 'obj: ', p.obj.getText(), ' ', ' path: ', p.path.map(p => p.getText()).join('-'))
  if (p.str) return [ts.createStringLiteral(
    p.path.map((p) => p.getText()).join('.')
  )]
  throw new Error("todo");
}

/*
a.b
PropertyAccessExpression
  expression: Identifier(a)
  name: Identifier(b)


a.b.c
  PropertyAccessExpression
    expression: PropertyAccessExpression
      expression: Identifier(a)
      name: Identifier(b)
    name: Identifier(c)
  */