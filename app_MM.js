
const margin = {top: 80, right: 15, bottom: 10, left: 15}
const width = 700 - margin.left - margin.right;
const height = 900 - margin.bottom - margin.top;
const x = 200;
const y = 100;
const radius =width/2.5

const outerRadius = Math.min(width, height) * 0.5 - 60;
const innerRadius = outerRadius - 10



const scaleColor = d3.scaleOrdinal(d3.schemeDark2)
const barSize = 40;



const svg = d3.select('.viz').append('svg')

   svg
   .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    // .attr('margin', '20px')


    const g = svg.append('g')
    .attr("transform", "translate(" + (margin.left) + "," + (margin.top) + ")");

    

        
    const createChart = async () =>  {
      try {

      let data = await d3.csv('./dp_live.csv', d3.autoType)
      data = data.filter(d => d.indicator === 'HEALTHEXP' && d.subject === 'TOT' && d.measure==='USD_CAP')
      

      const groupData = d3.group(data, d => d.location)
      

      const extend = d3.extent(data, d=> d.value)
      

      const n = 20;

      const names = new Set(data.map(d => d.location))

      const datevalues = Array.from(d3.rollup(data, ([d]) => d.value, d => +d.time, d => d.location))
      .map(([time, data]) => [new Date(time, 1,1), data])
      .sort(([a], [b]) => d3.ascending(a, b))

      const rank = (value) => {
        const data = Array.from(names, name => ({name, value: value(name)}));
        data.sort((a, b) => d3.descending(a.value, b.value));
        for (let i = 0; i < data.length; ++i) data[i].rank = Math.min(n, i);
        return data;
      }

      


      const k = 8;


     
        const keyframes = [];
        let ka, a, kb, b;
        for ([[ka, a], [kb, b]] of d3.pairs(datevalues)) {
          for (let i = 0; i < k; ++i) {
            const t = i / k;
            keyframes.push([
              // new Date( kb ),
              new Date(ka * (1 - t) + kb * t),
              // (ka * (1 - t) + kb * t),
              rank(name => (a.get(name) || 0) * (1 - t) + (b.get(name) || 0) * t)
            ]);
          }
        }
        keyframes.push([new Date(kb), rank(name => b.get(name) || 0)]);
       
      


     

      const nameframes = d3.groups(keyframes.flatMap(([, data]) => data), d => d.name)

      

      const prev = new Map(nameframes.flatMap(([, data]) => d3.pairs(data, (a, b) => [b, a])))

      const next = new Map(nameframes.flatMap(([, data]) => d3.pairs(data)))


      function bars(svg) {
        let bar = svg.append("g")
            .attr("fill-opacity", .8)
          .selectAll("rect");

         
      
        return ([date, data], transition) => 
        {

        const extend = d3.extent(data, d=> d.value)
              
        bar = bar
          .data(data.slice(0, n), d => d.name)
          .join(
            enter => enter.append("rect")
              .attr("fill", color(extend))
              .attr("height", y.bandwidth())
              .attr("x", x(0))
              .attr("y", d => y((prev.get(d) || d).rank))
              .attr("width", d => x((prev.get(d) || d).value) - x(0)),
            update => update,
            exit => exit.transition(transition).remove()
              .attr("y", d => y((next.get(d) || d).rank))
              .attr("width", d => x((next.get(d) || d).value) - x(0))
          )
          .call(bar => bar.transition(transition)
            .attr("y", d => y(d.rank))
            .attr("fill", color(extend))
            .attr("width", d => x(d.value) - x(0)));
          }
      }


      function labels(svg) {
        let label = svg.append("g")
            // .style("font", "bold 12px")
            // .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")
          .selectAll("text");
      
        return ([date, data], transition) => {
        
                  
        label = label
          .data(data.slice(0, n), d => d.name)
          .join(
            enter => enter.append("text")
              .attr("transform", d => `translate(${x((prev.get(d) || d).value)},${y((prev.get(d) || d).rank)})`)
              .attr("y", y.bandwidth() / 2)
              .attr("x", -8)
              .classed('country', true)
              .attr("dy", "-0.25em")
              .text(d => d.name)
              .call(text => text.append("tspan")
                .classed('number', true)
                // .attr("fill-opacity", 0.5)
                .attr("font-weight", "normal")
                .attr("x", -8)
                .attr("dy", "1.15em")),
            update => update,
            exit => exit.transition(transition).remove()
              .attr("transform", d => `translate(${x((next.get(d) || d).value)},${y((next.get(d) || d).rank)})`)
              .call(g => g.select("tspan").tween("text", d => textTween(d.value, (next.get(d) || d).value)))
          )
          .call(bar => bar.transition(transition)
            .attr("transform", d => `translate(${x(d.value)},${y(d.rank)})`)
            .call(g => g.select("tspan").tween("text", d => textTween((prev.get(d) || d).value, d.value))))

          }
      }

      function textTween(a, b) {
        const i = d3.interpolateNumber(a, b);
        return function(t) {
          this.textContent = formatNumber(i(t));
        };
      }

      const formatNumber = d3.format("$.1f")


      function axis(svg) {
        const g = svg.append("g")
            .attr("transform", `translate(0,${margin.top})`);
      
        const axis = d3.axisTop(x)
            .ticks(width / 160)
            .tickSizeOuter(0)
            .tickSizeInner(-barSize * (n + y.padding()));
      
        return (_, transition) => {
          g.transition(transition).call(axis);
          g.select(".tick:first-of-type text").remove();
          g.selectAll(".tick:not(:first-of-type) line").attr("stroke", "white");
          g.selectAll(".tick:first-of-type line").attr("stroke", "#e4eddb");
          g.select(".domain").remove();
        };
      }

      function ticker(svg) {
        const now = svg.append("text")
            // .style("font", `bold ${barSize}px var(--sans-serif)`)
            // .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")
            .attr("x", width - 6)
            .attr("y", margin.top + barSize * (n - 0.45))
            .attr("dy", "0.32em")
            .classed('year', true)
            .text(formatDate(keyframes[0][0]));
      
        return ([date], transition) => {
          transition.end().then(() => now.text(formatDate(date)));
        };
      }


      svg.append("text")
            // .style("font", `bold ${barSize}px var(--sans-serif)`)
            // .style("font-variant-numeric", "tabular-nums")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", margin.top + barSize * (n -2))
            .attr("dy", "0.32em")
            .classed('title', true)
            .text('Total Health Spending ($ per capita)');

      const formatDate = d3.utcFormat("%Y")


      // const color = () => {
        
      //   const scale = d3.scaleOrdinal(d3.schemeDark2);
      //   if (data.some(d => d.name !== undefined)) {
      //     const categoryByName = new Map(data.map(d => [d.name, d.name]))
      //     scale.domain(Array.from(categoryByName.values()));
      //     return d => scale(categoryByName.get(d.name));
      //   }        
      //   return d => scale(d.name);
      // }
      const color = (extend) => {

        const scale = d3.scaleSequential(['#e4eddb','#144d53']).domain(extend)
           
        return d => scale(d.value);
      }

      const x = d3.scaleLinear([0, 1], [margin.left, width - margin.right])


      const y = d3.scaleBand()
      .domain(d3.range(n + 1))
      .rangeRound([margin.top, margin.top + barSize * (n + 1 + 0.1)])
      .padding(0.1)

    

      const updateBars = bars(svg);
    const updateAxis = axis(svg);
    const updateLabels = labels(svg);
    const updateTicker = ticker(svg);

      //  const transition = d3.transition()
      // .duration(750)
      // .ease(d3.easeLinear)

      // x.domain([0, keyframes[0][1][0].value]);


      //   updateAxis(keyframes[1], transition);
      // updateBars(keyframes[1], transition);
      // updateLabels(keyframes[1], transition);
      // updateTicker(keyframes[1], transition);
    
    // .end();
    
    
    for (const keyframe of keyframes) {

      
      
      // console.log(keyframe)
      
      const transition = d3.transition()
      .duration(640)
      .ease(d3.easeLinear)
  
      // Extract the top bar’s value.
      x.domain([0, keyframe[1][0].value]);
  
      updateAxis(keyframe, transition);
      updateBars(keyframe, transition);
      updateLabels(keyframe, transition);
      updateTicker(keyframe, transition);



      // invalidation.then(() => svg.interrupt());
      await transition.end();

    }



      } catch (e) {
        console.log(e)
      }

    }
  
     createChart()



