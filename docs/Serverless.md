# Serverless Notes

- Use cloudformation to generate AWS resources
- Not really platform agnostic
- Still better than CFN

## Variable Syntax

- Replace `${varName}` style with `{{varName}}` to avoid clashes with CFN syntax
- Like this:

```yaml
provider:
  # ...
  variableSyntax: "{{([ ~:a-zA-Z0-9._\\'\",\\-\\/\\(\\)]+?)}}"
```

## Outputs

- Get outputs to pass into other commands (e.g. build pipeline)
- Needs plugin: https://github.com/sbstjn/serverless-stack-output
- Write outputs to JSON file, can be ingested by other tools

## Resource References

- Use CFNs built-in meagre selection of intrinsic functions
- Only supports the JSON syntax, even though it's a yaml file

  ```yaml
  Resource:
  - !GetAtt 
    - TextToSpeechFn
    - Arn
  ```

- Becomes:

  ```yaml
  Resource:
    - {'Fn::GetAtt': ['SomeResource', 'Arn']}
  ```

## Static Assets

- Using [handlebars cli](https://www.npmjs.com/package/hbs-cli) and make targets
- Use outputs from `serverless-stack-output` as input to template
- Allows build pipeline - deploy first, build web assets, sync using `aws-cli`
- In a similar fashion we could integrate webpack builds, etc.
- Alternatives: https://www.npmjs.com/package/serverless-s3-sync - how to do build steps?
