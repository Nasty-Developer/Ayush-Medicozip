import{r as o}from"./index-CAW-LK2_.js";function c(e,t){const[r,n]=o.useState(e);return o.useEffect(()=>{const s=setTimeout(()=>n(e),t);return()=>clearTimeout(s)},[e,t]),r}export{c as u};
