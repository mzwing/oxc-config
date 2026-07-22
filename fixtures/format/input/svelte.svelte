<script lang='ts'>
  export const content = "hi!"
</script>
  
<article>
  <!-- Intentionally uses raw HTML for formatter coverage -->
  <div>{@html content}</div>
</article>
